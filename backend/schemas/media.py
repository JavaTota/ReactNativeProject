from typing import Literal
from pydantic import BaseModel, Field
from schemas.common import InputModel


class UploadInput(InputModel):
    extension: Literal["jpg", "png", "webp"]


class ReadMediaInput(InputModel):
    path: str = Field(max_length=400, pattern=r"^[\w/-]+\.(jpg|png|webp)$")


class UploadResponse(BaseModel):
    path: str
    signedUrl: str
    token: str


class ReadMediaResponse(BaseModel):
    signedUrl: str
