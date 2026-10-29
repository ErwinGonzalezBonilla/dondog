// Crea (o cambia la contraseña de) un administrador del panel.
// Uso: npm run crear-admin -- correo@dondog.cl            (pide la contraseña)
//      ADMIN_PASSWORD=... npm run crear-admin -- correo@dondog.cl "Nombre"
const readline = require("node:readline");
const { createAdmin } = require("../auth");

const [email, name = ""] = process.argv.slice(2);
if (!email || !email.includes("@")) {
  console.error("Uso: npm run crear-admin -- correo@dominio.cl [\"Nombre\"]");
  process.exit(1);
}

function ask(q) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.stdoutMuted = true;
    rl._writeToOutput = s => { if (!rl.stdoutMuted || s.includes(q)) rl.output.write(s); };
    rl.question(q, a => { rl.close(); process.stdout.write("\n"); resolve(a); });
  });
}

(async () => {
  let pass = process.env.ADMIN_PASSWORD;
  if (!pass) {
    pass = await ask("Contraseña (mín. 10 caracteres): ");
    const again = await ask("Repite la contraseña: ");
    if (pass !== again) { console.error("Las contraseñas no coinciden."); process.exit(1); }
  }
  if (pass.length < 10) { console.error("La contraseña debe tener al menos 10 caracteres."); process.exit(1); }
  const r = await createAdmin(email, pass, name);
  console.log(r.updated ? `Contraseña actualizada para ${email}.` : `Administrador ${email} creado. Entra en /admin`);
})();
