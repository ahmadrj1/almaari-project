import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "User"

    id = Column(String, primary_key=True, default=generate_uuid)
    fullName = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=False)
    passwordHash = Column(String, nullable=False)
    role = Column(String, default="USER", nullable=False)
    resetToken = Column(String, nullable=True)
    resetTokenExp = Column(DateTime, nullable=True)
    stripeCustomerId = Column(String, unique=True, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    orders = relationship("Order", back_populates="user")
    addresses = relationship("Address", back_populates="user")
    notifications = relationship("Notification", back_populates="user")


class Category(Base):
    __tablename__ = "Category"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    products = relationship("Product", back_populates="category")


class Color(Base):
    __tablename__ = "Color"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=False)
    hexCode = Column(String, nullable=False)

    variants = relationship("ProductVariant", back_populates="color")
    images = relationship("ProductImage", back_populates="color")


class Size(Base):
    __tablename__ = "Size"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, nullable=False)
    sortOrder = Column(Integer, default=0, nullable=False)

    variants = relationship("ProductVariant", back_populates="size")


class Product(Base):
    __tablename__ = "Product"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    titlePrefix = Column(String, nullable=False)
    code = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    image = Column(String, nullable=False)
    categoryId = Column(String, ForeignKey("Category.id", ondelete="SET NULL"), nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deletedAt = Column(DateTime, nullable=True)

    category = relationship("Category", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    embedding = relationship("ProductEmbedding", back_populates="product", uselist=False, cascade="all, delete-orphan")
    orderItems = relationship("OrderItem", back_populates="product")


class ProductVariant(Base):
    __tablename__ = "ProductVariant"

    id = Column(String, primary_key=True, default=generate_uuid)
    productId = Column(String, ForeignKey("Product.id", ondelete="CASCADE"), nullable=False)
    colorId = Column(String, ForeignKey("Color.id"), nullable=False)
    sizeId = Column(String, ForeignKey("Size.id"), nullable=False)
    stock = Column(Integer, default=0, nullable=False)
    sku = Column(String, unique=True, nullable=False)

    product = relationship("Product", back_populates="variants")
    color = relationship("Color", back_populates="variants")
    size = relationship("Size", back_populates="variants")


class ProductImage(Base):
    __tablename__ = "ProductImage"

    id = Column(String, primary_key=True, default=generate_uuid)
    productId = Column(String, ForeignKey("Product.id", ondelete="CASCADE"), nullable=False)
    colorId = Column(String, ForeignKey("Color.id", ondelete="SET NULL"), nullable=True)
    url = Column(String, nullable=False)
    sortOrder = Column(Integer, default=0, nullable=False)

    product = relationship("Product", back_populates="images")
    color = relationship("Color", back_populates="images")


class Address(Base):
    __tablename__ = "Address"

    id = Column(String, primary_key=True, default=generate_uuid)
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    street = Column(String, nullable=False)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)
    zipCode = Column(String, nullable=True)
    isDefault = Column(Boolean, default=False, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="addresses")
    orders = relationship("Order", back_populates="address")


class Order(Base):
    __tablename__ = "Order"

    id = Column(String, primary_key=True, default=generate_uuid)
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="PENDING", nullable=False)
    subTotal = Column(Numeric(10, 2), nullable=False)
    tax = Column(Numeric(10, 2), nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    addressId = Column(String, ForeignKey("Address.id"), nullable=False)
    paymentMethod = Column(String, default="CASH_ON_DELIVERY", nullable=False)
    paymentStatus = Column(String, default="PENDING", nullable=False)
    paymentIntentId = Column(String, unique=True, nullable=True)
    stripePaymentMethodId = Column(String, nullable=True)

    user = relationship("User", back_populates="orders")
    address = relationship("Address", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "OrderItem"

    id = Column(String, primary_key=True, default=generate_uuid)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    orderId = Column(String, ForeignKey("Order.id", ondelete="CASCADE"), nullable=False)
    productId = Column(String, ForeignKey("Product.id"), nullable=False)
    colorName = Column(String, nullable=False)
    sizeName = Column(String, nullable=False)
    sku = Column(String, nullable=True)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="orderItems")


class Notification(Base):
    __tablename__ = "Notification"

    id = Column(String, primary_key=True, default=generate_uuid)
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    isRead = Column(Boolean, default=False, nullable=False)
    notif_metadata = Column("metadata", JSONB, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")


class ProductEmbedding(Base):
    __tablename__ = "ProductEmbedding"

    id = Column(String, primary_key=True, default=generate_uuid)
    productId = Column(String, ForeignKey("Product.id", ondelete="CASCADE"), unique=True, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(JSONB, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="embedding")
