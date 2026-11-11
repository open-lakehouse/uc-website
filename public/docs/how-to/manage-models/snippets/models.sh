#!/usr/bin/env bash
# View, update, rename, and delete registered models with the uc CLI.
#
# The CLI equivalents of models_sdk.py. With the uc-mlflow environment running
# and a model `unity.manage_models.linear` with versions 1 and 2 registered, it
# runs every step in order.

uc() { docker exec unitycatalog bin/uc "$@"; }

uc registered_model list --catalog unity --schema manage_models --output jsonPretty
uc model_version list --full_name unity.manage_models.linear --output jsonPretty
uc model_version get --full_name unity.manage_models.linear --version 1 --output jsonPretty

uc registered_model update --full_name unity.manage_models.linear \
  --comment "Predicts y from x with a linear fit"
uc model_version update --full_name unity.manage_models.linear --version 2 \
  --comment "Retrained on the new slope"

uc registered_model update --full_name unity.manage_models.linear \
  --new_name linear_regression --output jsonPretty
# Rename it back, so the steps below find it by its first name.
uc registered_model update --full_name unity.manage_models.linear_regression \
  --new_name linear

uc model_version delete --full_name unity.manage_models.linear --version 2

# Without --force, this fails while the model still has a version.
uc registered_model delete --full_name unity.manage_models.linear

uc registered_model delete --full_name unity.manage_models.linear --force true
