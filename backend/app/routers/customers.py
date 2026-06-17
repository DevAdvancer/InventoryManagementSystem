"""Customer CRUD endpoints."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Customer
from app.schemas.schemas import Customer as CustomerSchema
from app.schemas.schemas import CustomerCreate

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.post(
    "/",
    response_model=CustomerSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new customer",
)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)) -> Customer:
    customer = Customer(**payload.model_dump())
    try:
        db.add(customer)
        db.commit()
        db.refresh(customer)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A customer with email '{payload.email}' already exists",
        )
    return customer


@router.get("/", response_model=List[CustomerSchema], summary="List all customers")
def list_customers(
    db: Session = Depends(get_db), skip: int = 0, limit: int = 100
) -> List[Customer]:
    return db.query(Customer).order_by(Customer.id).offset(skip).limit(limit).all()


@router.get(
    "/{customer_id}", response_model=CustomerSchema, summary="Get a customer by ID"
)
def get_customer(customer_id: int, db: Session = Depends(get_db)) -> Customer:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with id {customer_id} not found",
        )
    return customer


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a customer",
)
def delete_customer(customer_id: int, db: Session = Depends(get_db)) -> None:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with id {customer_id} not found",
        )
    db.delete(customer)
    db.commit()
    return None
