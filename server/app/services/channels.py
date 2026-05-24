from enum import Enum


class InteractionChannel(str, Enum):
    WHATSAPP = "whatsapp"
    DASHBOARD = "dashboard"
    DEV = "dev"
