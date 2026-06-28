> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 🏛️ 7. Desacoplamento da Arquitetura (Separação de Responsabilidades)

Com o banco hospedado nativamente na AWS, "enxugamos" nossa infraestrutura Docker:

1. **Removemos o container `db`**: O arquivo `docker-compose.prod.yml` não possui mais o serviço `db` nem volumes persistentes locais. O servidor EC2 agora é puramente "Stateless" (Sem Estado).
2. **Injeção de Dependência**: A URL de conexão (`DATABASE_URL`) agora é injetada pelo arquivo `.env` da máquina hospedeira diretamente para o container da API, removendo dependências diretas entre containers.

---

