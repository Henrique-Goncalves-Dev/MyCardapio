# API do Meu Cardápio

API REST em Node.js 22+ que usa o Supabase Auth e o Data API/Postgres. Não precisa instalar dependências externas.

## Executar localmente

1. Copie `.env.example` para `.env` dentro desta pasta e preencha `SUPABASE_PUBLISHABLE_KEY` com a chave publishable do projeto Supabase.
2. Inicie a API com `npm run dev` dentro de `backend`, ou use `npm run api` na raiz.
3. Verifique `http://localhost:3333/api/health`.

Na raiz do projeto, use `npm run api` para iniciar o backend em modo de desenvolvimento e `npm start` para iniciar o app Ionic. O app local espera a API em `http://localhost:3333`. Em produção, configure `apiUrl` em `src/environments/environment.prod.ts` ou encaminhe `/api` pelo mesmo domínio, e inclua a origem do frontend em `FRONTEND_ORIGINS`.

A chave usada aqui é publishable; a chave `service_role`/secret nunca deve ser colocada no app ou neste servidor.

## Rotas

| Método | Rota | Acesso | Uso |
| --- | --- | --- | --- |
| GET | `/api/health` | Público | Estado da API e configuração do Supabase |
| POST | `/api/auth/signup` | Público | Cria conta por e-mail e senha; Supabase envia a confirmação |
| POST | `/api/auth/login` | Público | Login por e-mail e senha |
| POST | `/api/auth/refresh` | Público | Renova sessão com `refresh_token` |
| POST | `/api/auth/logout` | Sessão | Encerra sessões no Supabase |
| GET | `/api/auth/me` | Sessão | Retorna a conta autenticada |
| GET | `/api/establishments` | Público | Lista perfis publicados; aceita `q`, `cuisine`, `latitude` e `longitude` |
| GET | `/api/establishments/:slug` | Público | Abre um perfil publicado com horários e cardápio |
| GET | `/api/me/establishment` | Sessão | Retorna o estabelecimento da conta atual |
| POST | `/api/me/establishment` | Sessão | Cria o perfil do estabelecimento |
| PATCH | `/api/me/establishment` | Sessão | Atualiza o perfil e os horários |
| PUT | `/api/me/menu` | Sessão | Substitui categorias e itens em uma transação |
| POST | `/api/me/establishment/publish` | Sessão | Publica após validar perfil e cardápio |
| POST | `/api/me/establishment/unpublish` | Sessão | Retira o perfil do catálogo público |

Para rotas protegidas, envie `Authorization: Bearer <access_token>` recebido no login. O banco aplica RLS por conta e a API nunca usa a chave `service_role`.

No painel Supabase, inclua a URL de confirmação `http://localhost:4200/gestao/entrar?confirmacao=1` em **Authentication → URL Configuration → Redirect URLs**. Configure também o SMTP antes de usar confirmação de e-mail em produção.
