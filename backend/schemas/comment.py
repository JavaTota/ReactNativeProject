from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from schemas.common import InputModel


class CommentInput(InputModel):
    body: str = Field(min_length=1, max_length=1000)

    @field_validator("body", mode="before")
    @classmethod
    def trim_body(cls, value):
        return value.strip() if isinstance(value, str) else value


class CommentResponse(BaseModel):
    id: str
    trip_id: str
    user_id: str
    body: str
    created_at: datetime
    updated_at: datetime
