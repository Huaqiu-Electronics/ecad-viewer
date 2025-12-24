# ...existing code...
FROM debian:bookworm AS build
ARG IMAGE_TAG=""

# install build dependencies
RUN apt-get update && \
    apt-get install -y \
    curl \
    python3-dev \
    git \
    python3-pip \
    python3-venv 

RUN sh -c 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - ' ;\
    apt-get install -y nodejs ;

WORKDIR /src

RUN set -ex;   \
    git clone https://github.com/Huaqiu-Electronics/ecad-viewer.git;\
    git clone https://github.com/Huaqiu-Electronics/ecad-viewer-docker-scripts.git;

WORKDIR /src/ecad-viewer

RUN set -ex; \
    npm install; \
    npm run build-all; \
    mv debug /app; \
    mv build /app/ecad_viewer; \
    echo "IMAGE_TAG=$IMAGE_TAG"; \
    if [ -n "$IMAGE_TAG" ]; then \
    cp /app/ecad_viewer/ecad-viewer.js /app/ecad_viewer/ecad-viewer-"$IMAGE_TAG".js; \
    sed -i "s|<script type=\\\"module\\\" src=\\\"./ecad_viewer/ecad-viewer.js\\\"></script>|<script type=\\\"module\\\" src=\\\"./ecad_viewer/ecad-viewer-$IMAGE_TAG.js\\\"></script>|g" /app/index.html; \
    fi;

RUN set -ex; \
    mv /src/ecad-viewer-docker-scripts /app/scripts;\
    rm -rf /app/scripts/.git;

FROM debian:bookworm AS runtime
ARG USER_NAME=kicad
ARG USER_UID=1000
ARG USER_GID=$USER_UID

LABEL org.opencontainers.image.authors='https://github.com/Huaqiu-Electronics' \
    org.opencontainers.image.url='https://eda.cn' \
    org.opencontainers.image.documentation='https://docs.eda.cn/' \
    org.opencontainers.image.source='https://github.com/Huaqiu-Electronics/ecad-viewer' \
    org.opencontainers.image.vendor='Huqiu-Electronics' \
    org.opencontainers.image.licenses='GPL-3.0-or-later' \
    org.opencontainers.image.description='ECAD Viewer Service'

# install runtime dependencies
RUN apt-get update && \
    apt-get install -y  \
    python3\
    sudo

COPY --from=build /app /app

# cleanup
RUN apt-get clean autoclean; \
    apt-get autoremove -y; \
    rm -rf /var/lib/apt/lists/*

# Setup user
RUN groupadd --gid $USER_GID $USER_NAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USER_NAME \
    && usermod -aG sudo $USER_NAME \
    && echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

RUN chmod -R 777 /app

USER $USER_NAME
ENTRYPOINT [ "/app/scripts/start_all.sh" ]