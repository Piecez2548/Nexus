# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

The existing React interface also runs in Electron and Capacitor Android wrappers. These wrappers do not establish a separate native design language.

## Users

Nexus remains useful for its owner first. Its initial commercial audience is Thai salaried workers and freelancers who want one private place to understand daily cash flow, bills, savings goals, and investments. Advanced trading, productivity, health, and utility workspaces serve experienced users without defining the entry experience.

## Product Purpose

Nexus is a finance-first personal operating system for Thai users. It brings daily money, saving, investing, and selected life workflows into one private, local-first application. Simple mode supports everyday decisions; Pro mode exposes the complete workspace without changing the user's data.

## Operating Context

The repository implements transactions, accounts, budgets, savings goals, trading positions, portfolio holdings, todos, habits, and recurring schedules. Data is stored on-device; cloud synchronization is optional. The existing web development entry is `npm run dev` using Vite.

## Capabilities and Constraints

- Preserve local-first operation and the ability to use the core application without cloud configuration.
- Preserve optional encrypted synchronization and existing data-protection behavior.
- Existing AI Analytics is a local, rule-based engine, not an LLM service. Do not invent remote AI capabilities.
- Follow the existing architecture; reuse services, repositories, stores, hooks, and shared components. Keep business logic outside React components and preserve deterministic behavior.
- Preserve current functionality and minimize changes. Planned features must remain identified as Planned.
- Commercial claims require user evidence. Do not present planned integrations, market data, pricing, compliance, or enterprise features as shipped.

## Brand Commitments

The existing product name is Nexus. Initialization does not authorize changes to the existing interface or identity.

## Evidence on Hand

Existing product and implementation evidence is in `README.md`, `docs/MODULES.md`, `docs/PROJECT_ARCHITECTURE.md`, `docs/SECURITY.md`, and `src/`. Future capability claims must be checked against implementation. No customer, testimonial, pricing, or commercial positioning claims were supplied during initialization.

## Product Principles

- Prioritize trustworthy daily financial decisions and the owner's personal workflows.
- Use progressive disclosure: Simple mode for everyday needs and Pro mode for the complete product.
- Keep local operation useful independently of optional cloud services.
- Preserve data integrity, deterministic calculations, and existing behavior.
- Extend the existing architecture without duplicating business logic.
