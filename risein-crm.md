# Overview
CRM Rise In - Um CRM no estilo Kommo com Kanban, Integração WhatsApp (gratuita) e Automações Básicas para uma equipe interna.

# Project Type
WEB

# Success Criteria
- Kanban funcional com drag and drop.
- Conexão e troca de mensagens WhatsApp funcionais sem custos diretos de API (usando whatsapp-web.js ou similar via QR Code).
- Automações simples (ex: mover cards).
- Autenticação de equipe única (todos veem tudo).

# Tech Stack
- **Frontend**: Next.js (React), Tailwind CSS (alta performance e UI rápida).
- **Backend**: Node.js com Express e Socket.io (essencial manter o backend separado para estabilidade da sessão do WhatsApp).
- **Database**: PostgreSQL usando Prisma ORM.
- **WhatsApp API**: `whatsapp-web.js` (100% gratuito).

# File Structure
```
/risein-crm
  /frontend (Next.js config)
  /backend (Node.js API & whatsapp instance)
  /prisma (Schema e migrations na raiz ou no backend)
```

# Task Breakdown
1. **[database-architect]** Modelagem do Banco de Dados.
   - Skills: database-design
   - INPUT: Schema requirements (Leads, Stages, Messages).
   - OUTPUT: `schema.prisma`.
   - VERIFY: `npx prisma validate` and `npx prisma db push --preview-feature` (on sqlite/local pg).

2. **[backend-specialist]** Setup do Servidor e API do WhatsApp.
   - Skills: nodejs-best-practices, api-patterns
   - INPUT: Init Node.js express + whatsapp-web.js setup.
   - OUTPUT: Endpoints REST para Leads e Worker de conexão WhatsApp que expõe o QR Code no terminal/endpoint.
   - VERIFY: Executar `node server.js` e conseguir conectar o WhatsApp da empresa escaneando o QR Code.

3. **[backend-specialist]** Endpoints do CRM e Automações Básicas.
   - Skills: api-patterns, clean-code
   - INPUT: Lógica de trigger e actions.
   - OUTPUT: Rotas CRUD de Leads, Estágios e motor que escuta webhook interno para mover o ticket.
   - VERIFY: Chamadas do postman ou cURL criando e movendo leads.

4. **[frontend-specialist]** Setup do Next.js e UI do Kanban (Rise In).
   - Skills: frontend-design, nextjs-react-expert
   - INPUT: Design referência do Kommo.
   - OUTPUT: Componente React Kanban (usando dnd-kit) com Estágios e Leads, consumindo endpoints do backend.
   - VERIFY: UI renderizada em `http://localhost:3000` refletindo Leads em colunas e permitindo mover via drag and drop.

5. **[frontend-specialist]** Chat UI de WhatsApp Interno.
   - Skills: frontend-design, react-best-practices
   - INPUT: Integração Socket.io com o frontend.
   - OUTPUT: Interface de chat anexada ao Lead para histórico e resposta de mensagens.
   - VERIFY: Enviar e receber mensagens em tempo real refletindo na tela.

# Phase X: Verification
- [ ] Run `npm run lint` nas duas pastas (frontend/backend)
- [ ] Segurança: python .agent/skills/vulnerability-scanner/scripts/security_scan.py .
- [ ] UX/Design check na UI final.
