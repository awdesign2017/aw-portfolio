package io.awportfoiioapi.security.jwt;


import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.RSAKey;
import io.awportfoiioapi.rsa.repository.RsaRepository;
import io.awportfoiioapi.security.pem.PemKey;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

@Configuration
@RequiredArgsConstructor
public class SignatureConfig {
    
    
    private final RsaRepository repository;
    
    
    @Bean
    public RsaSecuritySigner rsaSigner() throws JOSEException {
        return new RsaSecuritySigner();
    }
    
    @Bean
    public RSAKey rsaKey() throws Exception {
        RSAPrivateKey privateKey = PemKey.loadPrivateKey(repository.findAll().get(0).getRsaPrivateKey());
        RSAPublicKey publicKey = PemKey.derivePublicKey(privateKey);
        return new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .keyID("rsaKey")
                .algorithm(JWSAlgorithm.RS256)
                .build();
    }
}
