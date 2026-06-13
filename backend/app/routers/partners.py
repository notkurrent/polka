"""Compatibility exports for partner routers.

The actual endpoint implementations live in partner_api.py and partner_public.py.
"""

from app.routers.partner_common import *  # noqa: F401,F403
from app.routers.partner_api import *  # noqa: F401,F403
from app.routers.partner_public import create_partner_inquiry, get_partner_detail
from app.routers.partner_public import router as public_router
