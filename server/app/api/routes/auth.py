from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import get_current_user
from app.core.security import create_access_token
from app.models.user import User
from app.models.user_profile import UserContact, UserIdentity
from app.schemas.auth import AuthUserResponse, RegisterRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest) -> TokenResponse:
    existing = await User.find_one(User.email == body.email)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    if body.whatsapp_number:
        whatsapp_taken = await User.find_one(
            User.contact.whatsapp_number == body.whatsapp_number
        )
        if whatsapp_taken is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="WhatsApp number already registered",
            )

    user = User(
        email=body.email,
        password_hash="",
        contact=UserContact(
            email=body.email,
            whatsapp_number=body.whatsapp_number,
        ),
        identity=UserIdentity(display_name=body.display_name),
    )
    user.set_password(body.password)
    await user.insert()

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> TokenResponse:
    user = await User.find_one(User.email == form_data.username)
    if user is None or not user.check_password(form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user.last_login_at = datetime.now(timezone.utc)
    user.touch_updated()
    await user.save()

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=AuthUserResponse)
async def auth_me(current_user: User = Depends(get_current_user)) -> AuthUserResponse:
    return AuthUserResponse(
        id=str(current_user.id),
        email=current_user.email,
        display_name=current_user.identity.display_name,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
    )
