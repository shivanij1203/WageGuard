from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health),
    path("upload/", views.upload_document),
    path("documents/", views.list_documents),
    path("documents/<str:doc_id>/", views.document_detail),
    path("query/", views.query_documents),
    path("deepgram-token/", views.deepgram_token),
]
