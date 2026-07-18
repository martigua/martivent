"""Curated catalog mapping raw Django permissions to human capability labels.

Only permissions that exist today (governance CRUD on the scaffolding models)
are named. The friendly granter and audit lenses show this catalog instead of
the several-hundred-row raw permission dropdown. New entries are added here as
club-domain models arrive; the drift test keeps the catalog honest.
"""

CATALOG = [
    (
        "People & access",
        [
            ("accounts.change_user", "Manage users"),
            ("access.change_role", "Manage roles"),
            ("access.change_roleassignment", "Assign roles"),
            ("access.change_organizationalgroup", "Manage groups"),
            ("access.change_grant", "Manage grants"),
        ],
    ),
    (
        "Features",
        [
            ("features.change_feature", "Manage feature flags"),
            ("features.change_featurerule", "Manage feature rules"),
        ],
    ),
]


def catalog():
    return CATALOG


def choices():
    """Grouped choices for a select widget: [(group, [(name, label)])]."""
    return [(group, list(entries)) for group, entries in CATALOG]


def permission_names():
    return [name for _, entries in CATALOG for name, _ in entries]


def _labels():
    return {name: label for _, entries in CATALOG for name, label in entries}


def label_for(permission_name):
    """Human label for a permission, or the raw name when uncatalogued."""
    return _labels().get(permission_name, permission_name)
