from django.db import models


class SectionVisibility(models.Model):
    """Bureau-owned visibility for permanent site sections."""

    key = models.SlugField(unique=True)
    enabled = models.BooleanField(default=False)
    label = models.CharField(max_length=120)
    help_text = models.TextField(blank=True)

    class Meta:
        verbose_name = "section visibility"
        verbose_name_plural = "section visibilities"

    def __str__(self):
        state = "on" if self.enabled else "off"
        return f"{self.label} ({state})"
