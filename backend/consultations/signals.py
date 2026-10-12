from django.db.models.signals import post_save
from django.dispatch import receiver

from ai_screenings.services import ScreeningService
from consultations.models import Consultation


@receiver(post_save, sender=Consultation)
def compare_ai_screening_to_diagnosis(sender, instance: Consultation, **kwargs):
    """Record whether the linked AI screening matched the vet's diagnosis.

    Runs whenever a consultation is saved with a diagnosis so the verdict is
    ready for model retraining as soon as consultation writes go live.
    """
    diagnosis = (instance.con_diagnosis or '').strip()
    if not diagnosis:
        return

    appointment = instance.apt_id
    screening = appointment.apt_screening if appointment else None
    if screening is None:
        return

    try:
        ScreeningService.record_comparison(screening, diagnosis, consultation=instance)
    except Exception:
        # Never block saving a consultation because a verdict could not be stored.
        pass
