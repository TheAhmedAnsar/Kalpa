# --- Build stage -------------------------------------------------------------
    FROM node:20-slim as build

    WORKDIR /app
    
    # System deps for native modules (if any)
    RUN apt-get update && apt-get install -y \
        python3 \
        make \
        g++ \
        curl \
        && rm -rf /var/lib/apt/lists/*
    
    # Copy package files
    COPY package*.json ./
    
    # Clean install approach to avoid rollup issues
    RUN npm cache clean --force
    RUN rm -rf node_modules package-lock.json 2>/dev/null || true
    
    # Install dependencies with flags to handle rollup quirks
    RUN npm install --no-audit --no-fund --legacy-peer-deps
    
    # Ensure rollup binary exists (fallback)
    RUN npm install @rollup/rollup-linux-x64-gnu@latest --save-optional --force || \
        curl -L https://registry.npmjs.org/@rollup/rollup-linux-x64-gnu/-/rollup-linux-x64-gnu-4.21.3.tgz | \
        tar -xz -C /tmp && mkdir -p node_modules/@rollup && \
        cp -r /tmp/package node_modules/@rollup/rollup-linux-x64-gnu || true
    
    # Copy source
    COPY . .
    
    # Build the app
    RUN npm run build
    
    # --- Runtime stage (serve with Vite preview) --------------------------------
    FROM node:20-slim
    
    WORKDIR /app
    
    # Install serve (lightweight static server)
    RUN npm install -g serve
    
    # Copy the built output only
    COPY --from=build /app/dist ./dist
    
    # Run as non-root for safety
    USER node
    
    # Use PORT if provided; default to 80
    EXPOSE 80
    CMD ["sh", "-c", "serve -s dist -l ${PORT:-8080}"]