# Global Registry Guide

Generated from Galerina build output.

## Principle

Local variables belong to flows. Global values belong to the registry. Mutable global state should be explicit, controlled and rare.

## Constants

- none

## Runtime Config

- none

## Secrets

- none

Secret values are redacted in generated reports, source maps, generated documentation and AI context.

## Controlled State

- none

## Required Environment

- none

## Security Rules

- Global values must be declared in the registry.
- Global values must have explicit types.
- Secrets must use SecureString.
- Secret values must be redacted in reports.
- Mutable shared state must be declared as state.
- Global mutation must be restricted.

## Diagnostics

- none
