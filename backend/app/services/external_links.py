import ipaddress
from urllib.parse import urlparse

class ExternalLinkError(ValueError):
    pass

def normalize_external_url(value):
    value = str(value or "").strip()
    if not value:
        return ""
    if len(value) > 1000:
        raise ExternalLinkError("Ссылка слишком длинная")
    parsed = urlparse(value)
    if parsed.scheme.lower() != "https":
        raise ExternalLinkError("Разрешены только HTTPS-ссылки")
    if not parsed.hostname or parsed.username or parsed.password:
        raise ExternalLinkError("Некорректная ссылка")
    host = parsed.hostname.lower().rstrip(".")
    if host in {"localhost", "localhost.localdomain"} or host.endswith(".local"):
        raise ExternalLinkError("Локальные адреса запрещены")
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        ip = None
    if ip and (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast):
        raise ExternalLinkError("Локальные и служебные адреса запрещены")
    return value
