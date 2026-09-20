# Receita Lembrete

Sistema que lê uma foto/PDF de receita médica, extrai os medicamentos com IA
e cria lembretes recorrentes no Google Calendar a partir do horário da
primeira dose. Também acompanha o estoque (quantidade de comprimidos) e cria
um lembrete de "comprar/renovar" antes de acabar — útil para medicamentos de
uso contínuo/mensal.

- `backend/` — API em FastAPI (Python)
- `frontend/` — Web app em React (PWA), também usado para gerar o app Android

## 1. Pré-requisitos (contas gratuitas)

Crie estas contas/credenciais antes de rodar o sistema. São passos que só
você pode fazer (login, aceitar termos, criar credenciais):

1. **Anthropic API key** — https://console.anthropic.com → API Keys.
   Usada para ler a receita (Claude com visão).
2. **Google Cloud Console** — https://console.cloud.google.com
   - Crie um projeto.
   - Em "APIs e Serviços" → "Biblioteca", ative a **Google Calendar API**.
   - Em "APIs e Serviços" → "Tela de consentimento OAuth", configure como
     "Externo", adicione seu e-mail como usuário de teste (evita precisar
     publicar o app enquanto testa).
   - Em "Credenciais" → "Criar credenciais" → "ID do cliente OAuth" →
     tipo "Aplicativo da Web". Em "URIs de redirecionamento autorizados"
     adicione: `http://localhost:8000/auth/google/callback` (e depois a URL
     do backend em produção).
   - Copie o **Client ID** e **Client Secret**.

## 2. Rodando localmente

### Opção A — Docker (recomendado)

```bash
copy backend\.env.example backend\.env
```

Edite `backend/.env` e preencha `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID` e
`GOOGLE_CLIENT_SECRET`.

```bash
docker compose up --build
```

- Backend: http://localhost:8000 (docs em http://localhost:8000/docs)
- Frontend: http://localhost:5173

Os dois serviços sobem com hot-reload (o código local é montado dentro dos
containers), então editar os arquivos em `backend/app` ou `frontend/src`
atualiza automaticamente. O banco SQLite fica num volume Docker
(`backend_data`), então os dados sobrevivem a `docker compose down` (mas não
a `docker compose down -v`).

Para parar: `docker compose down`. Para ver logs de um serviço específico:
`docker compose logs -f backend`.

### Opção B — sem Docker

**Backend**

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edite `backend/.env` e preencha `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID` e
`GOOGLE_CLIENT_SECRET`.

```bash
uvicorn app.main:app --reload
```

A API sobe em `http://localhost:8000`.

**Frontend**

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Abre em `http://localhost:5173`. Faça login com Google, autorize o acesso
ao Calendar, envie uma foto de receita e confirme os horários.

## 3. Deploy gratuito (para outros usuários testarem)

| Peça | Onde | Por quê |
|---|---|---|
| Código | [GitHub](https://github.com) — repositório free | Render e Vercel puxam o deploy direto de lá |
| Backend (FastAPI) | [Render.com](https://render.com) — Web Service free | Roda o `render.yaml` deste projeto direto do GitHub |
| Banco de dados | [Neon.tech](https://neon.tech) — Postgres free | Render free não tem disco persistente; Neon dá Postgres gratuito |
| Frontend (React) | [Vercel](https://vercel.com) free | Hospedagem estática gratuita com HTTPS |

Essas contas (GitHub, Render, Neon, Vercel) só você pode criar — são login/
cadastro pessoal. Depois de criadas, siga:

### 3.1. Suba o código para o GitHub

Em https://github.com/new crie um repositório (pode ser privado). Depois:

```bash
git remote add origin https://github.com/SEU-USUARIO/receita-lembrete.git
git branch -M main
git push -u origin main
```

### 3.2. Banco de dados (Neon)

1. Crie uma conta em https://neon.tech e um projeto novo.
2. No painel do projeto, copie a **Connection string** (algo como
   `postgresql://usuario:senha@ep-xxx.neon.tech/neondb?sslmode=require`).
   Guarde — vai usar no Render como `DATABASE_URL`.

### 3.3. Backend (Render)

1. Em https://dashboard.render.com/blueprints clique em **New Blueprint
   Instance** e conecte o repositório do GitHub que você acabou de criar.
   O Render lê o `render.yaml` da raiz do projeto automaticamente e já
   configura o serviço (nome, build, start command, plano free).
2. Ele vai pedir para preencher as variáveis marcadas `sync: false`:
   - `DATABASE_URL`: a connection string do Neon (passo 3.2)
   - `ANTHROPIC_API_KEY`: a mesma chave do seu `.env` local
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: os mesmos do `.env` local
     (ou crie um novo Client ID de produção — seção 1)
   - `GOOGLE_REDIRECT_URI`: `https://SEU-BACKEND.onrender.com/auth/google/callback`
     (troque `SEU-BACKEND` pelo nome que o Render gerar — você vê isso após
     criar o serviço, na URL exibida no topo da página)
   - `FRONTEND_ORIGIN`: preencha depois de criar o Vercel (passo 3.4) e
     redeploy
   - `SECRET_KEY` já é gerado automaticamente pelo Render
3. Deploy. Teste `https://SEU-BACKEND.onrender.com/health` — deve responder
   `{"status":"ok"}`.

### 3.4. Frontend (Vercel)

1. Em https://vercel.com/new importe o mesmo repositório do GitHub.
2. Em "Root Directory" selecione `frontend`.
3. Framework preset: Vite (o Vercel detecta sozinho).
4. Em "Environment Variables" adicione `VITE_API_URL` =
   `https://SEU-BACKEND.onrender.com` (URL do Render, sem barra no final).
5. Deploy. Você recebe uma URL tipo `https://receita-lembrete.vercel.app`.
6. Volte no Render e atualize `FRONTEND_ORIGIN` para essa URL do Vercel,
   depois clique em "Manual Deploy" para reiniciar o backend com o valor
   novo (é o que libera o CORS para o frontend em produção).

### 3.5. Atualize o Google Cloud Console

No mesmo projeto usado nos passos 1-7 da seção 1:

1. **Público-alvo** → adicione o e-mail de quem for testar como "Usuário de
   teste" (enquanto o app não é publicado/verificado, só esses e-mails
   conseguem logar).
2. **Clientes** → edite o Client ID (ou crie um novo para produção) →
   em **URIs de redirecionamento autorizados** adicione:
   ```
   https://SEU-BACKEND.onrender.com/auth/google/callback
   ```
   (mantenha também o `http://localhost:8000/...` se ainda for testar local)

### Limitação do free tier

O Render free "dorme" depois de ~15 minutos sem uso — a primeira requisição
depois disso demora ~30-50s para acordar (normal, não é erro). Aceitável
para testes; para uso real considere um plano pago para não dormir.

## 4. Gerando o app Android (mesmo código do site)

Em vez de escrever um app nativo separado, o site é empacotado com o
[Capacitor](https://capacitorjs.com), que gera um APK real reaproveitando
100% do frontend React (inclusive acesso à câmera nativa).

```bash
cd frontend
npm install @capacitor/core @capacitor/android
npx cap init "Receita Lembrete" "com.seudominio.receitalembrete" --web-dir=dist
npm run build
npx cap add android
npx cap sync
npx cap open android
```

Isso abre o projeto no Android Studio, onde você pode rodar num emulador/
celular ou gerar o APK/AAB assinado para instalar. Requer o Android Studio
instalado (gratuito).

## 5. Como funciona o agendamento

1. A IA extrai de cada medicamento: nome, dose, intervalo em horas, vezes
   ao dia, duração (se houver) e quantidade total na caixa.
2. Você confirma/corrige os dados e informa o horário da primeira dose.
3. O backend calcula os demais horários do dia (ex.: primeira dose 08:00 de
   8/8h → 08:00, 16:00, 00:00) e cria **uma série recorrente por horário**
   no Google Calendar (a recorrência do Calendar é diária, por isso um
   remédio 3x/dia vira 3 séries).
4. Se o medicamento tem duração definida (ex. "por 7 dias") ou quantidade
   limitada, a série termina na data calculada. Se for contínuo, a série
   não tem fim.
5. Para medicamentos contínuos ou com quantidade informada, é criado um
   evento avulso de "🔔 Comprar/renovar receita" alguns dias antes de
   acabar o estoque (configurável via `REFILL_REMINDER_DAYS_BEFORE`).
6. Ao marcar "tomei agora" no app, o estoque é decrementado e a data desse
   lembrete de reposição é recalculada.

## Limitações conhecidas (MVP)

- A leitura da receita depende da qualidade da foto e da caligrafia; sempre
  revise os dados extraídos antes de confirmar.
- O Google Calendar não avisa o backend quando você marca um evento como
  concluído — por isso o controle de estoque depende do botão "tomei agora"
  no app, e não do calendário.
- Um usuário só tem uma conta Google conectada por vez (campo
  `google_calendar_id`, padrão "primary").
