from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsReceptionist
from notifications.serializers import NotificationSerializer
from notifications.services import NotificationService


class NotificationListView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request):
        unread_only = request.query_params.get('unread_only', 'false').lower() == 'true'
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        result = NotificationService.list_notifications(
            user_id=request.user.usr_id,
            unread_only=unread_only,
            page=page,
            page_size=page_size,
        )

        serializer = NotificationSerializer(result['results'], many=True)
        return Response({
            'total': result['total'],
            'page': result['page'],
            'page_size': result['page_size'],
            'total_pages': result['total_pages'],
            'results': serializer.data,
        })


class NotificationUnreadCountView(APIView):
    permission_classes = [IsReceptionist]

    def get(self, request):
        count = NotificationService.get_unread_count(request.user.usr_id)
        return Response({'unread_count': count})


class NotificationMarkReadView(APIView):
    permission_classes = [IsReceptionist]

    def patch(self, request, ntf_id):
        ntf = NotificationService.mark_read(ntf_id, request.user.usr_id)
        if ntf is None:
            return Response(
                {'detail': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = NotificationSerializer(ntf)
        return Response(serializer.data)


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsReceptionist]

    def patch(self, request):
        NotificationService.mark_all_read(request.user.usr_id)
        return Response({'detail': 'All notifications marked as read.'})
