"""
auth.py — SHA-256 with Salt Password Hashing and Token Auth for WealthLens 2.0
"""
import hashlib
import secrets
import hmac
import json
import base64
import time
from typing import Optional

SECRET_KEY = "wealthlens-secret-key-super-secure-key-2026"

def generate_salt() -> str:
    """Generate a random 16-byte hex salt."""
    return secrets.token_hex(16)

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with a salt.
    Returns (password_hash_hex, salt_hex).
    """
    if not salt:
        salt = generate_salt()
    
    key = hashlib.pbkdf2_hmac(
        hash_name='sha256',
        password=password.encode('utf-8'),
        salt=salt.encode('utf-8'),
        iterations=100000
    )
    return key.hex(), salt

def verify_password(password: str, salt: str, stored_hash: str) -> bool:
    """Verifies a plain password against the stored salt and hash."""
    computed_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(computed_hash, stored_hash)

def create_access_token(data: dict, expires_in_seconds: int = 86400 * 7) -> str:
    """
    Creates a signed JSON web token using HMAC-SHA256.
    """
    payload = data.copy()
    payload["exp"] = int(time.time()) + expires_in_seconds
    
    header_json = json.dumps({"alg": "HS256", "typ": "JWT"}).encode('utf-8')
    payload_json = json.dumps(payload).encode('utf-8')
    
    header_b64 = base64.urlsafe_b64encode(header_json).decode('utf-8').rstrip('=')
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode('utf-8').rstrip('=')
    
    signature_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodes and verifies a signed token. Returns payload dict or None.
    """
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        header_b64, payload_b64, signature_b64 = parts
        
        # Verify signature
        signature_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), signature_input, hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode('utf-8').rstrip('=')
        
        if not hmac.compare_digest(signature_b64, expected_sig_b64):
            return None
        
        # Decode payload
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += '=' * (4 - rem)
        
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        # Check expiration
        if payload.get("exp") and time.time() > payload["exp"]:
            return None
        
        return payload
    except Exception:
        return None
