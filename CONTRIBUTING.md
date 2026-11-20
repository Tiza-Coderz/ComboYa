# Cómo contribuir

## Flujo de ramas (Git Flow)

| Rama | Propósito |
|---|---|
| `main` | Producción. Solo recibe merges de `release/*` y `hotfix/*`, siempre con tag `vX.Y.Z`. |
| `develop` | Integración. Rama por defecto para PRs. |
| `feature/<nombre>` | Nueva funcionalidad. Sale de `develop`, vuelve a `develop` por PR. |
| `fix/<nombre>` | Corrección no urgente. Igual que `feature/*`. |
| `release/X.Y.Z` | Estabilización: versión, CHANGELOG. Merge a `main` (+tag) y de vuelta a `develop`. |
| `hotfix/X.Y.Z` | Urgente en producción. Sale de `main`, merge a `main` (+tag) y `develop`. |

```bash
git switch develop && git pull
git switch -c feature/carrito
# ... commits pequeños ...
git push -u origin feature/carrito
gh pr create --base develop
```

Los PRs se integran con **merge commit** (`--no-ff`) para conservar el historial de cada funcionalidad.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/es/) en español, validados por commitlint:

```
feat(carrito): persistir el carrito en localStorage
fix(checkout): validar teléfono cubano de 8 dígitos
test(precios): cubrir conversión USD→CUP con redondeo
```

Tipos: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `chore`, `ci`, `build`.

## Antes de abrir un PR

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Husky ejecuta `lint-staged` en cada commit y `commitlint` sobre el mensaje.
