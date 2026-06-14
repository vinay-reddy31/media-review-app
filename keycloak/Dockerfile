# Optimized Keycloak image for free-tier hosting (Render).
# The heavy "build/augmentation" step runs once here at image-build time,
# so the running container starts fast (start --optimized skips it).

# ---- Build stage: bake in the Postgres driver + config ----
FROM quay.io/keycloak/keycloak:26.1 AS builder
ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
RUN /opt/keycloak/bin/kc.sh build

# ---- Runtime stage ----
FROM quay.io/keycloak/keycloak:26.1
COPY --from=builder /opt/keycloak/ /opt/keycloak/

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
# Production mode, fast start. Database + admin creds come from env vars on Render.
CMD ["start", "--optimized", "--http-enabled=true", "--hostname-strict=false", "--proxy-headers=xforwarded"]
