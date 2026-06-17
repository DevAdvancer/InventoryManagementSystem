"""SQLAlchemy ORM models for the inventory & order management system."""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class Product(Base):
    """A product that the business sells and tracks in inventory."""

    __tablename__ = "products"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    sku = Column(String(64), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    quantity_in_stock = Column(Integer, nullable=False, default=0)
    low_stock_threshold = Column(Integer, nullable=False, default=5)
    created_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    order_items = relationship(
        "OrderItem", back_populates="product", cascade="all, delete-orphan"
    )


class Customer(Base):
    """A customer who can place orders."""

    __tablename__ = "customers"

    id = Column(BigInteger, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    phone = Column(String(32), nullable=False)
    address = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")


class Order(Base):
    """A customer order referencing one or more products via OrderItem rows."""

    __tablename__ = "orders"

    id = Column(BigInteger, primary_key=True, index=True)
    customer_id = Column(
        BigInteger, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    status = Column(String(32), nullable=False, default="pending")
    total_amount = Column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    customer = relationship("Customer", back_populates="orders")
    items = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    """A line on an order: a product, a quantity, and a per-unit price snapshot."""

    __tablename__ = "order_items"

    id = Column(BigInteger, primary_key=True, index=True)
    order_id = Column(
        BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    product_id = Column(
        BigInteger, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
