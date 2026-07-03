# Governance CI

Run the governance checks locally with:

```bash
npm run governance:check
```

The CI workflow runs the same command on pull requests, pushes to `main`, and manual dispatches.

The checks cover:

- Appendix B static checks for intervention frontend revenue references.
- Appendix B static checks for `retention_email` / `discount_offer` reintroduction outside the historical migration exception.
- Appendix B static checks that `AdminLayout` contains an admin role guard.
- A-2 schema checks for the governed `intervention_trigger_type`.
- A-4 schema checks for public view `security_invoker=true` coverage and broad view access revokes.
