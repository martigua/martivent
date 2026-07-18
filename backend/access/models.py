from django.conf import settings
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class Role(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class OrganizationalGroup(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="children",
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="GroupMembership",
        related_name="organizational_groups",
    )

    class Meta:
        ordering = ("name",)

    def clean(self):
        super().clean()
        current = self.parent
        seen = {self.pk} if self.pk is not None else set()
        while current is not None:
            if current.pk in seen:
                raise ValidationError({"parent": "Organizational groups cannot form a cycle."})
            seen.add(current.pk)
            current = current.parent

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def ancestors(self, *, include_self=False):
        current = self if include_self else self.parent
        while current is not None:
            yield current
            current = current.parent

    def __str__(self):
        return self.name


class GroupMembership(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organizational_memberships",
    )
    group = models.ForeignKey(
        OrganizationalGroup,
        on_delete=models.CASCADE,
        related_name="memberships",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "group"),
                name="access_unique_group_membership",
            ),
        ]

    def __str__(self):
        return f"{self.user} in {self.group}"


class RoleAssignment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="role_assignments",
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    scope = models.ForeignKey(
        OrganizationalGroup,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="role_assignments",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "role", "scope"),
                nulls_distinct=False,
                name="access_unique_role_assignment",
            ),
        ]

    def __str__(self):
        suffix = f" in {self.scope}" if self.scope else ""
        return f"{self.user} — {self.role}{suffix}"


class Grant(models.Model):
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name="access_grants",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="access_grants",
    )
    role = models.ForeignKey(
        Role,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="grants",
    )
    group = models.ForeignKey(
        OrganizationalGroup,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="grants",
    )
    scope = models.ForeignKey(
        OrganizationalGroup,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="scoped_grants",
    )
    target_content_type = models.ForeignKey(
        ContentType,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="targeted_access_grants",
    )
    target_object_id = models.PositiveBigIntegerField(null=True, blank=True)
    target = GenericForeignKey("target_content_type", "target_object_id")

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(user__isnull=False, role__isnull=True, group__isnull=True)
                    | Q(user__isnull=True, role__isnull=False, group__isnull=True)
                    | Q(user__isnull=True, role__isnull=True, group__isnull=False)
                ),
                name="access_grant_exactly_one_recipient",
            ),
            models.CheckConstraint(
                condition=(
                    Q(target_content_type__isnull=True, target_object_id__isnull=True)
                    | Q(target_content_type__isnull=False, target_object_id__isnull=False)
                ),
                name="access_grant_complete_target",
            ),
            models.UniqueConstraint(
                fields=(
                    "permission",
                    "user",
                    "role",
                    "group",
                    "scope",
                    "target_content_type",
                    "target_object_id",
                ),
                nulls_distinct=False,
                name="access_unique_grant",
            ),
        ]

    @property
    def recipient(self):
        return self.user or self.role or self.group

    def clean(self):
        super().clean()
        recipients = (self.user_id, self.role_id, self.group_id)
        if sum(value is not None for value in recipients) != 1:
            raise ValidationError("A grant must have exactly one recipient.")

        target_fields = (self.target_content_type_id, self.target_object_id)
        if (target_fields[0] is None) != (target_fields[1] is None):
            raise ValidationError("Target type and object ID must be set together.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        permission = f"{self.permission.content_type.app_label}.{self.permission.codename}"
        return f"{self.recipient} — {permission}"
