import base64
import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


output_dir = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd() / "secrets"
output_dir.mkdir(parents=True, exist_ok=True)

private_key = ec.generate_private_key(ec.SECP256R1())
private_path = output_dir / "vapid_private.pem"

private_path.write_bytes(
    private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
)

public_numbers = private_key.public_key().public_numbers()
raw_public = (
    b"\x04"
    + public_numbers.x.to_bytes(32, "big")
    + public_numbers.y.to_bytes(32, "big")
)

public_key = base64.urlsafe_b64encode(raw_public).rstrip(b"=").decode("ascii")

print()
print("VAPID keys generated")
print("VAPID_PUBLIC_KEY=" + public_key)
print("Private key:", private_path)
print()
print("Copy VAPID_PUBLIC_KEY to .env.production")
