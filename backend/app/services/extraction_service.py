"""Reads a prescription image/PDF and extracts structured medication data
using Claude's vision capability. Doctors' handwriting and free-form dosage
instructions ("1 comprimido de 8/8h por 7 dias") make plain OCR + regex
unreliable, so we hand the image straight to the model and ask for JSON.
"""
import base64
import json

import anthropic

from app.config import settings
from app.schemas import PrescriptionExtractionResult

_EXTRACTION_PROMPT = """\
Você é um assistente que le receitas e prescrições médicas (imagem ou PDF) e extrai \
os medicamentos em formato estruturado.

Para cada medicamento encontrado, extraia:
- name: nome do medicamento (e concentração, se houver, ex: "Amoxicilina 500mg")
- dosage_text: a dose por tomada, como escrito (ex: "1 comprimido", "10ml")
- frequency_hours: de quantas em quantas horas é tomado (ex: "8/8h" -> 8, "1x ao dia" -> 24, \
"12/12h" -> 12). Se não houver intervalo explícito, infira a partir de "times_per_day" (24 / times_per_day).
- times_per_day: quantas vezes ao dia (ex: "3x ao dia" -> 3, "8/8h" -> 3)
- duration_days: por quantos dias deve ser tomado, se especificado (ex: "por 7 dias" -> 7). \
Use null se não especificado ou se for uso contínuo.
- is_continuous: true se for medicamento de uso contínuo/crônico (não tem data para parar, \
só acaba quando a caixa termina)
- total_quantity: quantidade total de unidades na receita/caixa, se mencionado ou dedutível \
(ex: "caixa com 30 comprimidos" -> 30). Use null se não for possível saber.

Responda APENAS com um JSON válido no formato:
{
  "medications": [
    {
      "name": "...",
      "dosage_text": "...",
      "frequency_hours": 8,
      "times_per_day": 3,
      "duration_days": 7,
      "is_continuous": false,
      "total_quantity": 21
    }
  ],
  "warnings": ["qualquer ambiguidade ou trecho ilegível que exija confirmação do usuário"]
}

Não inclua nenhum texto fora do JSON.
"""


def _media_type_for(filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".webp"):
        return "image/webp"
    if lower.endswith(".pdf"):
        return "application/pdf"
    return "image/jpeg"


def extract_medications(file_bytes: bytes, filename: str) -> PrescriptionExtractionResult:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    media_type = _media_type_for(filename)
    encoded = base64.standard_b64encode(file_bytes).decode("utf-8")

    if media_type == "application/pdf":
        content_block = {
            "type": "document",
            "source": {"type": "base64", "media_type": media_type, "data": encoded},
        }
    else:
        content_block = {
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": encoded},
        }

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": [
                    content_block,
                    {"type": "text", "text": _EXTRACTION_PROMPT},
                ],
            }
        ],
    )

    text = "".join(block.text for block in response.content if block.type == "text").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
    data = json.loads(text)
    return PrescriptionExtractionResult(**data)
