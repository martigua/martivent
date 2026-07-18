from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from access.models import OrganizationalGroup, Role, RoleAssignment


def _scope_covers(granted, requested):
    if granted is None:
        return True
    if requested is None:
        return False
    return any(ancestor.pk == granted.pk for ancestor in requested.ancestors(include_self=True))


class Feature(models.Model):
    key = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    variants = models.JSONField(default=list)
    default_variant = models.CharField(max_length=80)

    class Meta:
        ordering = ("key",)

    def clean(self):
        super().clean()
        valid_variants = (
            isinstance(self.variants, list)
            and bool(self.variants)
            and all(isinstance(item, str) and bool(item) for item in self.variants)
            and len(self.variants) == len(set(self.variants))
        )
        if not valid_variants:
            raise ValidationError({"variants": "Variants must be unique non-empty strings."})
        if self.default_variant not in self.variants:
            raise ValidationError({"default_variant": "Default must be an allowed variant."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.key


class FeatureRule(models.Model):
    class Audience(models.TextChoices):
        EVERYONE = "everyone", "Everyone"
        USER = "user", "User"
        ROLE = "role", "Role"
        GROUP = "group", "Organizational group"

    feature = models.ForeignKey(
        Feature,
        on_delete=models.CASCADE,
        related_name="rules",
    )
    priority = models.PositiveIntegerField()
    variant = models.CharField(max_length=80)
    audience = models.CharField(max_length=20, choices=Audience)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="feature_rules",
    )
    role = models.ForeignKey(
        Role,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="feature_rules",
    )
    group = models.ForeignKey(
        OrganizationalGroup,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="audience_feature_rules",
    )
    scope = models.ForeignKey(
        OrganizationalGroup,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="scoped_feature_rules",
    )

    class Meta:
        ordering = ("priority", "pk")
        constraints = [
            models.UniqueConstraint(
                fields=("feature", "priority"),
                name="features_unique_rule_priority",
            ),
            models.CheckConstraint(
                condition=(
                    Q(
                        audience="everyone",
                        user__isnull=True,
                        role__isnull=True,
                        group__isnull=True,
                    )
                    | Q(
                        audience="user",
                        user__isnull=False,
                        role__isnull=True,
                        group__isnull=True,
                    )
                    | Q(
                        audience="role",
                        user__isnull=True,
                        role__isnull=False,
                        group__isnull=True,
                    )
                    | Q(
                        audience="group",
                        user__isnull=True,
                        role__isnull=True,
                        group__isnull=False,
                    )
                ),
                name="features_rule_selected_audience",
            ),
        ]

    def clean(self):
        super().clean()
        if self.feature_id and self.variant not in self.feature.variants:
            raise ValidationError({"variant": "Rule must select an allowed variant."})

        selected = {
            self.Audience.USER: self.user_id is not None,
            self.Audience.ROLE: self.role_id is not None,
            self.Audience.GROUP: self.group_id is not None,
        }
        expected = {
            "user": self.audience == self.Audience.USER,
            "role": self.audience == self.Audience.ROLE,
            "group": self.audience == self.Audience.GROUP,
        }
        if selected != expected:
            raise ValidationError("Rule must set exactly its selected audience.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def matches(self, *, user=None, scope=None):
        if not _scope_covers(self.scope, scope):
            return False
        if self.audience == self.Audience.EVERYONE:
            return True
        if not getattr(user, "is_authenticated", False):
            return False
        if self.audience == self.Audience.USER:
            return self.user_id == user.pk
        if self.audience == self.Audience.GROUP:
            return user.organizational_memberships.filter(group_id=self.group_id).exists()
        if self.audience == self.Audience.ROLE:
            assignments = RoleAssignment.objects.filter(user=user, role_id=self.role_id)
            if self.scope_id is None:
                return assignments.exists()
            return any(
                _scope_covers(assignment.scope, scope)
                for assignment in assignments.select_related("scope")
            )
        return False

    def __str__(self):
        return f"{self.feature.key}: {self.priority} → {self.variant}"
