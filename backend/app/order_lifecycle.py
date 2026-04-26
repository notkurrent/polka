from fastapi import HTTPException

from app.models import OrderStatus


ACTIVE_ORDER_STATUSES = {OrderStatus.PENDING, OrderStatus.RESERVED}


def normalize_order_status(value: str) -> OrderStatus:
    normalized = value.strip().upper()
    for status in OrderStatus:
        if normalized in {status.name, status.value.upper()}:
            return status
    raise HTTPException(status_code=400, detail="Invalid order status")
