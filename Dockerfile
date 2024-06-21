FROM debian:bookworm AS build

RUN sh -c 'echo "deb http://ftp.de.debian.org/debian sid main" >> /etc/apt/sources.list'
# install build dependencies
RUN apt-get update && \
    apt-get install -y build-essential cmake libbz2-dev libcairo2-dev libglu1-mesa-dev \
    libgl1-mesa-dev libglew-dev libx11-dev libwxgtk3.2-dev \
    mesa-common-dev pkg-config python3-dev python3-wxgtk4.0 \
    libboost-all-dev libglm-dev libcurl4-openssl-dev \
    libgtk-3-dev \
    libngspice0-dev \
    ngspice-dev \
    libocct-modeling-algorithms-dev \
    libocct-modeling-data-dev \
    libocct-data-exchange-dev \
    libocct-visualization-dev \
    libocct-foundation-dev \
    libocct-ocaf-dev \
    unixodbc-dev \
    zlib1g-dev \
    shared-mime-info \
    git \
    gettext \
    ninja-build \
    libgit2-dev \
    libsecret-1-dev \
    libnng-dev \
    protobuf-compiler \
    swig4.0 \
    python3-pip \
    python3-venv \
    libprotobuf-dev \
    protobuf-compiler


WORKDIR /src

RUN set -ex;            \
    git clone -b kicad-cli --depth 1 https://gitlab.com/Liangtie/kicad.git; \
    git clone --depth 1  https://gitlab.com/kicad/libraries/kicad-symbols.git; \
    git clone --depth 1  https://gitlab.com/kicad/libraries/kicad-footprints.git; \
    git clone --depth 1  https://gitlab.com/kicad/libraries/kicad-templates.git; \
    git clone --depth 1  https://github.com/liangtie/meshoptimizer.git

WORKDIR /src/meshoptimizer

# We want the built install prefix in /usr to match normal system installed software
# However to aid in docker copying only our files, we redirect the prefix in the cmake install
RUN set -ex; \
    cmake --preset docker-release; \
    cmake --build build/linux/  ; \
    cmake --install build/linux/;

WORKDIR /src/kicad

# We want the built install prefix in /usr to match normal system installed software
# However to aid in docker copying only our files, we redirect the prefix in the cmake install
RUN set -ex; \
    mkdir -p build/linux; \
    cd build/linux; \
    cmake \
    -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DKICAD_SCRIPTING_WXPYTHON=ON \
    -DKICAD_USE_OCC=ON \
    -DKICAD_SPICE=ON \
    -DKICAD_BUILD_I18N=ON \
    -DCMAKE_INSTALL_PREFIX=/usr \
    -DKICAD_USE_CMAKE_FINDPROTOBUF=ON \
    ../../; \
    ninja; \
    cmake --install . --prefix=/usr/installtemp/

# Now test the build, shipping a broken image doesn't help us
# Maybe we should only run the cli tests but all of them is fine for now
# RUN set -ex; \
#     pip3 install -r ./qa/tests/requirements.txt --break-system-packages; \
#     cd build/linux; \
#     ctest --output-on-failure

# Continue library installs
RUN set -ex; \
    cd /src/kicad-symbols; \
    cmake \
    -G Ninja \
    -DCMAKE_RULE_MESSAGES=OFF \
    -DCMAKE_VERBOSE_MAKEFILE=OFF \
    -DCMAKE_INSTALL_PREFIX=/usr \
    . \
    ninja; \
    cmake --install . --prefix=/usr/installtemp/

RUN set -ex; \
    cd /src/kicad-footprints; \
    cmake \
    -G Ninja \
    -DCMAKE_RULE_MESSAGES=OFF \
    -DCMAKE_VERBOSE_MAKEFILE=OFF \
    -DCMAKE_INSTALL_PREFIX=/usr \
    . \
    ninja; \
    cmake --install . --prefix=/usr/installtemp/

RUN set -ex; \
    cd /src/kicad-templates; \
    cmake \
    -G Ninja \
    -DCMAKE_RULE_MESSAGES=OFF \
    -DCMAKE_VERBOSE_MAKEFILE=OFF \
    -DCMAKE_INSTALL_PREFIX=/usr \
    . \
    ninja; \
    cmake --install . --prefix=/usr/installtemp/


RUN rm -rf /src/kicad-symbols && rm -rf /src/kicad-footprints && rm -rf /src/kicad-templates && rm -rf /src/kicad

FROM debian:bookworm-slim AS runtime
ARG USER_NAME=kicad
ARG USER_UID=1000
ARG USER_GID=$USER_UID


LABEL org.opencontainers.image.authors='https://groups.google.com/a/kicad.org/g/devlist' \
    org.opencontainers.image.url='https://kicad.org' \
    org.opencontainers.image.documentation='https://docs.kicad.org/' \
    org.opencontainers.image.source='https://gitlab.com/kicad/kicad-ci/kicad-cli-docker' \
    org.opencontainers.image.vendor='KiCad' \
    org.opencontainers.image.licenses='GPL-3.0-or-later' \
    org.opencontainers.image.description='Image containing KiCad EDA, python and the stock symbol and footprint libraries for use in automation workflows'

RUN sh -c 'echo "deb http://ftp.de.debian.org/debian sid main" >> /etc/apt/sources.list'

# install runtime dependencies
RUN apt-get update && \
    apt-get install -y libbz2-dev libcairo2-dev libglu1-mesa-dev \
    libgl1-mesa-dev libglew-dev libx11-dev libwxgtk3.2-dev \
    mesa-common-dev pkg-config python3-dev python3-wxgtk4.0 \
    libboost-all-dev libglm-dev libcurl4-openssl-dev \
    libgtk-3-dev \
    libngspice0-dev \
    ngspice-dev \
    libocct-modeling-algorithms-dev \
    libocct-modeling-data-dev \
    libocct-data-exchange-dev \
    libocct-visualization-dev \
    libocct-foundation-dev \
    libocct-ocaf-dev \
    unixodbc-dev \
    zlib1g-dev \
    shared-mime-info \
    git \
    gettext \
    ninja-build \
    libgit2-dev \
    libsecret-1-dev \
    libnng-dev \
    protobuf-compiler \
    python3-pip \
    python3-venv \
    curl \
    sudo


COPY --from=build /usr/installtemp/bin /usr/bin
COPY --from=build /usr/installtemp/share /usr/share
COPY --from=build /usr/installtemp/lib /usr/lib

RUN set -ex;            \
    git clone --depth 1  https://gitlab.com/kicad/libraries/kicad-packages3D.git /usr/share/kicad/3dmodels;

RUN rm -rf /usr/share/kicad/3dmodels/.git

# fix the linkage to libkicad_3dsg
RUN ldconfig -l /usr/bin/_pcbnew.kiface

# cleanup
RUN apt-get clean autoclean; \
    apt-get autoremove -y; \
    rm -rf /var/lib/apt/lists/*

# Setup user
RUN groupadd --gid $USER_GID $USER_NAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USER_NAME \
    && usermod -aG sudo $USER_NAME \
    && echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

RUN sudo sh -c 'echo "export KICAD6_3DMODEL_DIR=/usr/share/kicad/3dmodels" >> /etc/profile'
RUN sudo sh -c 'echo "export KICAD7_3DMODEL_DIR=/usr/share/kicad/3dmodels" >> /etc/profile'
RUN sudo sh -c 'echo "export KICAD8_3DMODEL_DIR=/usr/share/kicad/3dmodels" >> /etc/profile'


# Copy over the lib tables to the user config directory
RUN mkdir -p /home/$USER_NAME/.config/kicad/$(kicad-cli -v | cut -d . -f 1,2)

RUN mv /usr/share/kicad/template/*-lib-table /home/$USER_NAME/.config/kicad/$(kicad-cli -v | cut -d . -f 1,2)

RUN chown -R $USER_NAME:$USER_NAME /home/$USER_NAME/.config
RUN chown -R $USER_NAME:$USER_NAME /tmp/org.kicad.kicad || true

USER $USER_NAME
