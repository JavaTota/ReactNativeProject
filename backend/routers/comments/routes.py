from uuid import UUID
from fastapi import APIRouter, Response
from database import Database
from dependencies import User
from schemas.common import Identifier, Offset, Page
from schemas.comment import CommentInput, CommentResponse
from services import comment_service

router = APIRouter(prefix="/api", tags=["Comments"])


@router.get("/posts/{post_id}/comments", response_model=Page[CommentResponse])
def list_comments(post_id: Identifier, db: Database, offset: Offset = 0):
    return comment_service.list_comments(db, post_id, offset)


@router.post(
    "/posts/{post_id}/comments", response_model=CommentResponse, status_code=201
)
def create_comment(
    post_id: Identifier, body: CommentInput, db: Database, current_user: User
):
    return comment_service.create_comment(db, current_user.user_id, post_id, body.body)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: UUID, db: Database, current_user: User):
    comment_service.delete_comment(db, current_user.user_id, comment_id)
    return Response(status_code=204)
