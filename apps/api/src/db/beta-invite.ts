import "../load-env";
import { betaInviteService } from "../services/beta-invite.service";

const USAGE = [
    "Uso:",
    "  bun run beta:convidar <email> [email...]",
    "  bun run beta:desconvidar <email> [email...]",
    "  bun run beta:convidados",
].join("\n");

async function main() {
    const [command, ...emails] = process.argv.slice(2);

    if (command === "list") {
        const invites = await betaInviteService.list();
        for (const invite of invites) {
            console.log(`${invite.createdAt.toISOString().slice(0, 10)}  ${invite.email}`);
        }
        console.log(`${invites.length} convidado(s).`);
        return;
    }

    if ((command !== "add" && command !== "remove") || emails.length === 0) {
        console.error(USAGE);
        process.exitCode = 1;
        return;
    }

    const invalid = emails.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
    if (invalid.length > 0) {
        console.error(`E-mail inválido: ${invalid.join(", ")}`);
        process.exitCode = 1;
        return;
    }

    if (command === "add") {
        const added = await betaInviteService.add(emails);
        console.log(`Convidado(s): ${added.length ? added.join(", ") : "nenhum novo (já estavam na lista)"}`);
    } else {
        const removed = await betaInviteService.remove(emails);
        console.log(`Removido(s): ${removed.length ? removed.join(", ") : "nenhum (não estavam na lista)"}`);
    }
}

main()
    .then(() => process.exit(process.exitCode ?? 0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
