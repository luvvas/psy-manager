# ECR (Elastic Container Registry)

**O que é:** registry privado de imagens Docker da AWS. Guarda a imagem da API.

**Quando é a resposta certa:** armazenar/distribuir imagens de container dentro da AWS (ECS, EKS, EC2) com pull na rede privada e IAM nativo.

## Pontos-chave
- **Digest (`@sha256:`)** = referência imutável; **tag** (`latest`) = rótulo móvel. Deploy por digest garante "mesmo artefato".
- **Tag immutability**: impede sobrescrever uma tag existente.
- **Scan on push**: varre CVEs ao receber a imagem (além do Trivy no CI).
- **Lifecycle policy**: expira imagens velhas/untagged pra não acumular storage.
- Auth via `aws ecr get-login-password | docker login`.

## Pegadinhas
- Deploy com `latest` ≠ build once — não há garantia de rodar o que foi testado. Use **digest**.
- Push precisa de `ecr:GetAuthorizationToken` (com `Resource: "*"`) + ações de layer no repo específico.
- Pull na EC2 → `AmazonEC2ContainerRegistryReadOnly` na Instance Role.

## Como usamos no Psy-Manager
- Build once → scan Trivy → push por digest → EC2 faz pull → [§20](../../progress/14-ecr-build-once.md)
- Lifecycle: 10 imagens recentes + expira untagged > 7d → `scripts/ecr-lifecycle-policy.json`
