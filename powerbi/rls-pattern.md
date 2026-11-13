# Row-level security implementation pattern

This repository documents a pattern; it does not enforce Power BI RLS itself.

1. Maintain a governed mapping table `security_user_branch` with `user_principal_name` and `branch_key`.
2. Relate the mapping to `dim_branch` through a controlled security path.
3. Define a role filter using the signed-in identity, for example:

```dax
security_user_branch[user_principal_name] = USERPRINCIPALNAME()
```

4. Test users assigned to one branch, multiple branches, and no branch.
5. Verify that totals, drill-through, exports, and any composite model paths respect the role.
6. Keep sensitive cost/margin columns out of broad consumer models; expose only approved measures.

Production deployment requires a Power BI tenant, identity governance, workspace permissions, and security testing. This starter project does not include those services.
