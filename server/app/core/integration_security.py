from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


_KEY_HINT = (
    "INTEGRATION_ENCRYPTION_KEY must be a Fernet key (32 url-safe base64 bytes). "
    "Generate one with: "
    "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
)


def _get_fernet() -> Fernet:
    key = settings.integration_encryption_key
    if not key:
        raise RuntimeError(f"INTEGRATION_ENCRYPTION_KEY is not configured. {_KEY_HINT}")
    try:
        return Fernet(key.encode("utf-8"))
    except ValueError as exc:
        raise RuntimeError(f"INTEGRATION_ENCRYPTION_KEY is invalid: {exc}. {_KEY_HINT}") from exc


def encrypt_secret(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_secret(ciphertext: str) -> str:
    try:
        return _get_fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt integration credential") from exc


def generate_encryption_key() -> str:
    return Fernet.generate_key().decode("utf-8")
