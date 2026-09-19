from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.services import OwnerService
from core.permissions import IsReceptionist
from owners.serializers import OwnerDetailSerializer, OwnerListSerializer


class OwnerListView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request):
        search = request.query_params.get('search')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        data = OwnerService.list_owners(
            search=search,
            page=page,
            page_size=page_size,
        )

        serializer = OwnerListSerializer(data['results'], many=True)
        return Response({
            'total': data['total'],
            'page': data['page'],
            'page_size': data['page_size'],
            'total_pages': data['total_pages'],
            'results': serializer.data,
        })


class OwnerDetailView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request, own_id):
        owner = OwnerService.get_owner_detail(own_id)
        if not owner:
            return Response(
                {'detail': 'Owner not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = OwnerDetailSerializer(owner)
        return Response(serializer.data)
