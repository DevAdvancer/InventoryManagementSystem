"""Product CRUD endpoints."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Product
from app.schemas.schemas import Product as ProductSchema
from app.schemas.schemas import ProductCreate, ProductUpdate

router = APIRouter(prefix="/products", tags=["Products"])


@router.post(
    "/",
    response_model=ProductSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)) -> Product:
    product = Product(**payload.model_dump())
    try:
        db.add(product)
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A product with SKU '{payload.sku}' already exists",
        )
    return product


@router.get("/", response_model=List[ProductSchema], summary="List all products")
def list_products(
    db: Session = Depends(get_db), skip: int = 0, limit: int = 100
) -> List[Product]:
    return db.query(Product).order_by(Product.id).offset(skip).limit(limit).all()


@router.get(
    "/{product_id}", response_model=ProductSchema, summary="Get a product by ID"
)
def get_product(product_id: int, db: Session = Depends(get_db)) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )
    return product


@router.put(
    "/{product_id}", response_model=ProductSchema, summary="Update a product"
)
def update_product(
    product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)
) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(product, key, value)

    try:
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A product with SKU '{updates.get('sku', product.sku)}' already exists",
        )
    return product


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product",
)
def delete_product(product_id: int, db: Session = Depends(get_db)) -> None:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )
    db.delete(product)
    db.commit()
    return None
