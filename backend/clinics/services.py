from clinics.models import Clinic


class ClinicService:

    @staticmethod
    def create(data: dict) -> Clinic:
        clinic = Clinic.objects.create(
            cln_name=data['cln_name'],
            cln_email=data.get('cln_email') or None,
            cln_phone=data.get('cln_phone') or None,
            cln_address=data.get('cln_address') or None,
            cln_license_no=data.get('cln_license_no') or None,
        )
        return clinic
