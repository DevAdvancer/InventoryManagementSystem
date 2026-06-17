"""Pydantic request/response schemas — the public API contract."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ---------- Product ----------

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    quantity_in_stock: int = Field(..., ge=0)
    low_stock_threshold: int = Field(5, ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = Field(None, min_length=1, max_length=64)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, ge=0)
    quantity_in_stock: Optional[int] = Field(None, ge=0)
    low_stock_threshold: Optional[int] = Field(None, ge=0)


class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Customer ----------

class CustomerBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: str = Field(..., min_length=1, max_length=32)
    address: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class Customer(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Order ----------

class OrderItemBase(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)


class OrderItemCreate(OrderItemBase):
    pass


class OrderItem(OrderItemBase):
    id: int
    unit_price: Decimal
    subtotal: Decimal
    product: Optional[Product] = None

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    customer_id: int = Field(..., gt=0)
    notes: Optional[str] = None
    items: List[OrderItemCreate] = Field(..., min_length=1)

    @field_validator("items")
    @classmethod
    def items_not_empty(cls, v: List[OrderItemCreate]) -> List[OrderItemCreate]:
        if not v:
            raise ValueError("An order must contain at least one item")
        return v


class Order(BaseModel):
    id: int
    customer_id: int
    status: str
    total_amount: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    customer: Optional[Customer] = None
    items: List[OrderItem] = []

    model_config = ConfigDict(from_attributes=True)


# ---------- Dashboard ----------

class DashboardSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    total_revenue: Decimal
    low_stock_products: List[Product] = []
