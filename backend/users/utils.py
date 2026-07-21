def extract_request_meta(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    ip = x_forwarded_for.split(',')[0].strip() if x_forwarded_for else request.META.get('REMOTE_ADDR', '')
    device = request.META.get('HTTP_USER_AGENT', '')[:255]
    return ip, device
