"""Order management endpoints, including inventory deduction logic."""
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.db.database import get_db
from app.models.models import Customer, Order, OrderItem, Product
from app.schemas.schemas import (
    DashboardSummary,
    Order as OrderSchema,
    OrderCreate,
    Product as ProductSchema,
)

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post(
    "/",
    response_model=OrderSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new order (decrements inventory atomically)",
)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)) -> Order:
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with id {payload.customer_id} not found",
        )

    # Group duplicate product lines so we can validate the consolidated quantity.
    consolidated: dict[int, int] = {}
    for item in payload.items:
        consolidated[item.product_id] = consolidated.get(item.product_id, 0) + item.quantity

    product_ids = list(consolidated.keys())
    products = (
        db.query(Product).filter(Product.id.in_(product_ids)).all()
        if product_ids
        else []
    )
    product_map = {p.id: p for p in products}

    for pid, qty in consolidated.items():
        if pid not in product_map:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {pid} not found",
            )
        if product_map[pid].quantity_in_stock < qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for product '{product_map[pid].name}' "
                    f"(SKU {product_map[pid].sku}): requested {qty}, "
                    f"available {product_map[pid].quantity_in_stock}"
                ),
            )

    order = Order(
        customer_id=payload.customer_id,
        notes=payload.notes,
        status="confirmed",
        total_amount=Decimal("0.00"),
    )
    db.add(order)
    db.flush()  # populate order.id without committing

    total = Decimal("0.00")
    for item in payload.items:
        product = product_map[item.product_id]
        unit_price = Decimal(product.price)
        subtotal = unit_price * item.quantity
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_price=unit_price,
                subtotal=subtotal,
            )
        )
        product.quantity_in_stock -= item.quantity
        total += subtotal

    order.total_amount = total
    db.commit()
    db.refresh(order)
    return order


@router.get("/", response_model=List[OrderSchema], summary="List all orders")
def list_orders(
    db: Session = Depends(get_db), skip: int = 0, limit: int = 100
) -> List[Order]:
    return (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .options(selectinload(Order.customer))
        .order_by(Order.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get(
    "/{order_id}", response_model=OrderSchema, summary="Get an order by ID"
)
def get_order(order_id: int, db: Session = Depends(get_db)) -> Order:
    order = (
        db.query(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .options(selectinload(Order.customer))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id {order_id} not found",
        )
    return order


@router.delete(
    "/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel/delete an order and restore stock",
)
def delete_order(order_id: int, db: Session = Depends(get_db)) -> None:
    order = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id {order_id} not found",
        )

    # Restore inventory when an order is removed.
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.quantity_in_stock += item.quantity

    db.delete(order)
    db.commit()
    return None


@router.get(
    "/dashboard/summary",
    response_model=DashboardSummary,
    summary="Aggregate counts, revenue, and low-stock list for the dashboard",
)
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    total_products = db.query(Product).count()
    total_customers = db.query(Customer).count()
    total_orders = db.query(Order).count()
    revenue = (
        db.query(Order).with_entities(Order.total_amount).all()
    )
    total_revenue = sum((row[0] for row in revenue), Decimal("0.00"))

    low_stock = (
        db.query(Product)
        .filter(Product.quantity_in_stock <= Product.low_stock_threshold)
        .order_by(Product.quantity_in_stock.asc())
        .all()
    )

    return DashboardSummary(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        total_revenue=total_revenue,
        low_stock_products=[ProductSchema.model_validate(p) for p in low_stock],
    )
