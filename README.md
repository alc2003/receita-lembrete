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

## 3. Deploy gratuito (para testes)

| Peça | Onde | Por quê |
|---|---|---|
| Backend (FastAPI) | [Render.com](https://render.com) — Web Service free | Free tier roda um app Python direto do GitHub |
| Banco de dados | [Neon.tech](https://neon.tech) — Postgres free | Render free não garante disco persistente; Neon dá Postgres gratuito |
| Frontend (React) | [Vercel](https://vercel.com) ou [Netlify](https://netlify.com) free | Hospedagem estática gratuita com HTTPS |

Passos:

1. Suba este projeto para um repositório no GitHub.
2. **Neon**: crie um banco Postgres gratuito e copie a connection string.
3. **Render**: crie um "Web Service" apontando para `backend/`, comando de
   start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Configure as
   variáveis de ambiente (as mesmas do `.env`, com `DATABASE_URL` apontando
   para o Neon e `FRONTEND_ORIGIN`/`GOOGLE_REDIRECT_URI` para as URLs reais).
4. **Vercel/Netlify**: aponte para `frontend/`, build command `npm run
   build`, publish directory `dist`. Configure `VITE_API_URL` para a URL do
   Render.
5. Volte no Google Cloud Console e adicione a URL de callback real
   (`https://SEU-BACKEND.onrender.com/auth/google/callback`) nos URIs de
   redirecionamento autorizados.

O free tier do Render "dorme" depois de alguns minutos sem uso — a primeira
requisição depois disso demora ~30s para acordar. Aceitável para testes.

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
