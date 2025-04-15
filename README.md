
## Different aspects of the setup.

### Workflow paths
```mermaid
graph TD
    subgraph "Development Environments"
        A[Local Development<br>make dev] -->|Flexible Mode| B[PNPM_FROZEN_LOCKFILE=false<br>Allow Updates]
        C[CI Pipeline<br>make dev-strict] -->|Strict Mode| D[PNPM_FROZEN_LOCKFILE=true<br>Enforce Lock]
        E[Vercel Deploy<br>vercel.json] -->|Flexible Mode| F[PNPM_FROZEN_LOCKFILE=false<br>Allow Updates]
        G[Package Updates<br>make pkg-sync] -->|Flexible Mode| H[PNPM_FROZEN_LOCKFILE=false<br>Allow Updates]
    end

    style A fill:#97c2fc
    style C fill:#ff9999
    style E fill:#99ff99
    style G fill:#ffcc99
```

```mermaid

graph LR
    subgraph "Benefits"
        A[Flexible Local Dev] -->|Enables| D[Smooth Development<br>Experience]
        B[Strict CI Checks] -->|Ensures| E[Dependency<br>Consistency]
        C[Flexible Deployment] -->|Prevents| F[Build Failures]
        
        D -->|Leads to| G[Developer<br>Productivity]
        E -->|Maintains| H[Project<br>Stability]
        F -->|Ensures| I[Reliable<br>Deployments]
    end

    style A fill:#97c2fc
    style B fill:#ff9999
    style C fill:#99ff99
    style G fill:#ffcc99
    style H fill:#ffcc99
    style I fill:#ffcc99
```



```mermaid
graph TD
    subgraph "Package Location & Mounting"
        A[Host Machine] --> |Source Code| B[".:/app"]
        
        subgraph "Container"
            B --> C["/app<br>Working Directory"]
            C --> D["package.json"]
            C --> E["pnpm-lock.yaml"]
            C --> F["node_modules"]
        end
        
        subgraph "Persistent Volumes"
            G["PNPM Store<br>Global Cache"]
            H["PNPM Cache<br>Project Cache"]
        end
        
        F --> |Uses| G
        F --> |Uses| H
        
        style A fill:#97c2fc
        style C fill:#ff9999
        style G fill:#99ff99
        style H fill:#99ff99
    end

```

```mermaid
graph TD
    subgraph "Security vs Flexibility Balance"
        A[Development] -->|Flexible| B[Quick Updates<br>Fast Fixes]
        C[CI/CD] -->|Strict| D[Security Checks<br>Consistency]

        B -->|Feeds Into| E[Controlled<br>Environment]
        D -->|Validates| E

        E -->|Results In| F[Secure &<br>Stable Product]
    end

    style A fill:#97c2fc
    style C fill:#ff9999
    style E fill:#99ff99
    style F fill:#ffcc99
```


```mermaid
graph TD
    subgraph "Package Location & Mounting Strategy"
        A[Host Machine] --> |"Bind Mount<br>Real-time Sync"| B[".:/app"]
        
        subgraph "Container Architecture"
            B --> |"Working Space"| C["/app<br>Working Directory"]
            C --> |"Dependency Spec"| D["package.json"]
            C --> |"Version Lock"| E["pnpm-lock.yaml"]
            C --> |"Local Modules"| F["node_modules"]
            
            %% Critical path annotations
            classDef critical fill:#ff6b6b,color:white
            class E critical
            
            %% Performance notes
            note1["🚀 Fast local development<br>with host bind mount"]
            note2["🔒 Consistent dependencies<br>across environments"]
            A --- note1
            E --- note2
        end
        
        subgraph "Performance Optimization"
            G["PNPM Store<br>Global Cache<br>📦 Shared across projects"]
            H["PNPM Cache<br>Project Cache<br>⚡ Fast reinstalls"]
            
            %% Cache benefits
            note3["♻️ Reduces network calls<br>💾 Saves disk space"]
            G & H --- note3
        end
        
        F --> |"Reuse Packages"| G
        F --> |"Quick Access"| H
        
        style A fill:#97c2fc
        style C fill:#ff9999
        style G fill:#99ff99,stroke-width:3px
        style H fill:#99ff99,stroke-width:3px
    end
```


## Configuration 

```mermaid
graph TD
    A[tsconfig.json] -.->|references| B[tsconfig.node.json]
    C[tsconfig.test.json] -->|extends| A
    D[vite.config.ts] -->|references| B
    E[vitest.config.ts] -->|uses| C
    E -->|setupFiles| F[vitest.setup.ts]
    G[package.json] -->|scripts| D
    G -->|scripts| E

    %% Add clarifying notes
    classDef config fill:#f9f,stroke:#333,stroke-width:2px
    class A,B,C config
    
    %% Add relationship notes
    note1[tsconfig.json references node.json,<br>not extends it]
    A --- note1
    
    note2[test.json extends base,<br>not the other way around]
    C --- note2
```

## Container Setup Architecture

### Package Installation Strategy

Our setup implements a two-stage package installation approach:

1. **Build-time Installation** (Dockerfile)
```dockerfile
COPY --chown=node:node package.json ./
COPY --chown=node:node pnpm-lock.yaml* ./
RUN pnpm install
```
Purpose:
- Generates initial lock file if missing
- Creates cached Docker layer for faster rebuilds
- Ensures platform-specific compilation (linux/amd64)
- Pre-compiles critical dependencies

2. **Runtime Installation** (docker-compose.yml)
```yaml
command: sh -c "pnpm install && pnpm dev:host"
```
Purpose:
- Syncs dependencies with host-mounted changes
- Enables real-time development workflow
- Maintains development flexibility

### Volume Strategy

```yaml
volumes:
  - .:/app                                        # Source code
  - pnpm-store:/home/node/.local/share/pnpm/store # Global package cache
  - pnpm-cache:/home/node/.cache/pnpm             # Project-specific cache
```

This structure:
- Maintains fast package operations across container restarts
- Prevents unnecessary re-downloads
- Separates global cache from project-specific cache

### Development Modes

The `PNPM_FROZEN_LOCKFILE` flag controls dependency installation behavior:
- `false`: Flexible mode for local development (allows updates)
- `true`: Strict mode for CI/CD (enforces lock file)

### Security Considerations

- Non-root user (`node`) for container operations
- Platform-specific builds (`linux/amd64`)
- Proper file ownership (`--chown=node:node`)
- Isolated package caches

This architecture balances development speed, security, and consistency while maintaining proper caching and platform compatibility.
