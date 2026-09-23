package io.awportfoiioapi.security.pem;

import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;

public class PemKey {

    public  static RSAPrivateKey loadPrivateKey(String pem) throws Exception {
        String privateKeyPem = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\r", "")  // CR 제거
                .replaceAll("\\n", "")  // LF 제거
                .replaceAll("\\s", ""); // 기타 공백 제거
        byte[] decoded = Base64.getDecoder().decode(privateKeyPem);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decoded);
        return (RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(spec);
    }

    // 공개키를 개인키(CRT)에서 계산 → 키 교체 시 DB 의 RSA 행만 바꾸면 됨 (public.pem 불필요)
    public  static RSAPublicKey derivePublicKey(RSAPrivateKey privateKey) throws Exception {
        RSAPrivateCrtKey crtKey = (RSAPrivateCrtKey) privateKey;
        RSAPublicKeySpec spec = new RSAPublicKeySpec(crtKey.getModulus(), crtKey.getPublicExponent());
        return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(spec);
    }
}
