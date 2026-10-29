FROM rust:1-slim AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home app
WORKDIR /app
COPY --from=builder /app/target/release/marvels-kitchen-api /usr/local/bin/marvels-kitchen-api
RUN mkdir -p /data && chown app:app /data
USER app
ENV HOST=0.0.0.0 PORT=8080 DB_PATH=/data/marvels-kitchen.sqlite3
EXPOSE 8080
VOLUME ["/data"]
CMD ["marvels-kitchen-api"]
