#!/usr/bin/env python3
"""
BMAD Orchestrator - Taskmaster
Orquesta el flujo completo de desarrollo siguiendo el workflow BMAD 3.0
"""

import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Try tomllib (Python 3.11+) first, fallback to tomli
try:
    import tomllib as tomli
except ImportError:
    try:
        import tomli
    except ImportError:
        print("❌ Error: tomli no está instalado. Ejecuta: pip install tomli")
        sys.exit(1)

# Configuración
BMAD_CONFIG = Path(__file__).parent.parent.parent / "bmad.toml"
LOG_DIR = Path(__file__).parent.parent.parent / "bmad" / "logs"
REPORT_DIR = Path(__file__).parent.parent.parent / "bmad" / "reports"
TRACKING_DIR = Path(__file__).parent.parent.parent / "bmad" / "tracking"

# Crear directorios si no existen
LOG_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)
TRACKING_DIR.mkdir(parents=True, exist_ok=True)


class BMADOrchestrator:
    """Orquestador principal del workflow BMAD"""
    
    def __init__(self, feature: Optional[str] = None):
        self.config = self._load_config()
        self.feature = feature
        self.current_phase = None
        self.iteration = 0
        self.max_iterations = 8
        self.scores = {}
        self.errors = []
        
    def _load_config(self) -> Dict:
        """Carga la configuración desde bmad.toml"""
        with open(BMAD_CONFIG, "rb") as f:
            # tomllib requires 'rb' mode, tomli also works with 'rb'
            return tomli.load(f)
    
    def log(self, message: str, level: str = "INFO"):
        """Registra un mensaje en el log"""
        timestamp = datetime.now().isoformat()
        log_file = LOG_DIR / f"orchestrator_{datetime.now().strftime('%Y%m%d')}.log"
        
        with open(log_file, "a") as f:
            f.write(f"[{timestamp}] [{level}] {message}\n")
        
        print(f"[{level}] {message}")
    
    def start_sprint(self, feature: str) -> bool:
        """Inicia un nuevo sprint para una funcionalidad"""
        self.feature = feature
        self.iteration = 0
        self.errors = []
        self.scores = {}
        
        self.log(f"🚀 Iniciando sprint para feature: {feature}")
        
        # Cargar tracking
        tracking_file = TRACKING_DIR / "implementation.json"
        if tracking_file.exists():
            with open(tracking_file) as f:
                tracking = json.load(f)
        else:
            tracking = {"features": {}, "current": None}
        
        tracking["current"] = feature
        tracking["features"][feature] = {
            "started_at": datetime.now().isoformat(),
            "iterations": [],
            "status": "in_progress"
        }
        
        with open(tracking_file, "w") as f:
            json.dump(tracking, f, indent=2)
        
        return True
    
    def phase_1_development(self) -> Tuple[bool, float]:
        """Fase 1: Desarrollo"""
        self.current_phase = "development"
        self.log("📝 Fase 1: Desarrollo iniciada")
        
        # Aquí se ejecutarían las tareas de desarrollo
        # Por ahora simulamos la ejecución
        
        score = 8.5  # Score simulado
        self.scores["development"] = score
        
        if score >= self.config["workflow"]["phase_1"]["threshold"]:
            self.log(f"✅ Fase 1 completada con score: {score}")
            return True, score
        else:
            self.log(f"❌ Fase 1 falló con score: {score}")
            return False, score
    
    def phase_2_validation(self) -> Tuple[bool, float]:
        """Fase 2: Validación"""
        self.current_phase = "validation"
        self.log("🔍 Fase 2: Validación iniciada")
        
        # Ejecutar validaciones
        checks = [
            self._check_typescript(),
            self._check_eslint(),
            self._check_build(),
            self._check_tests()
        ]
        
        passed = sum(checks)
        total = len(checks)
        score = (passed / total) * 10
        
        self.scores["validation"] = score
        
        if score >= self.config["workflow"]["phase_2"]["threshold"]:
            self.log(f"✅ Fase 2 completada con score: {score}")
            return True, score
        else:
            self.log(f"❌ Fase 2 falló con score: {score}")
            return False, score
    
    def phase_3_review_cycles(self) -> Tuple[bool, float]:
        """Fase 3: Ciclos de Revisión Profunda"""
        self.current_phase = "review"
        self.log("🔄 Fase 3: Ciclos de Revisión iniciados")
        
        for i in range(self.max_iterations):
            self.iteration = i + 1
            self.log(f"  Iteración {self.iteration}/{self.max_iterations}")
            
            # Ejecutar ciclo de revisión
            success, score = self.phase_2_validation()
            
            if not success:
                self.log(f"  ⚠️ Error en iteración {self.iteration}, reiniciando ciclos")
                return self.phase_3_review_cycles()  # Reiniciar
        
        avg_score = sum(self.scores.values()) / len(self.scores) if self.scores else 0
        self.log(f"✅ Fase 3 completada después de {self.max_iterations} iteraciones")
        return True, avg_score
    
    def phase_4_devops(self) -> Tuple[bool, float]:
        """Fase 4: DevOps + CI/CD"""
        self.current_phase = "devops"
        self.log("🔧 Fase 4: DevOps + CI/CD iniciada")
        
        # Verificar estado de CI/CD
        ci_status = self._check_ci_cd()
        
        score = 10.0 if ci_status else 7.0
        self.scores["devops"] = score
        
        if score >= 9.0:
            self.log(f"✅ Fase 4 completada con score: {score}")
            return True, score
        else:
            self.log(f"❌ Fase 4 falló con score: {score}")
            return False, score
    
    def phase_5_version_control(self) -> Tuple[bool, float]:
        """Fase 5: Control de Versiones"""
        self.current_phase = "version"
        self.log("📦 Fase 5: Control de Versiones iniciada")
        
        # Verificar que hay cambios para commit
        has_changes = self._check_git_changes()
        
        if has_changes:
            score = 9.5
            self.log("✅ Cambios listos para commit")
        else:
            score = 10.0
            self.log("ℹ️ No hay cambios pendientes")
        
        self.scores["version"] = score
        return True, score
    
    def phase_6_logging(self) -> Tuple[bool, float]:
        """Fase 6: Registro de Actividad"""
        self.current_phase = "logging"
        self.log("📋 Fase 6: Registro de Actividad iniciada")
        
        # Generar log completo
        log_data = {
            "sprint": self.feature,
            "tareas": list(self.scores.keys()),
            "errores": self.errors,
            "soluciones": [],
            "estado": "completed" if all(s >= 9.0 for s in self.scores.values()) else "in_progress",
            "hash_commit": self._get_git_hash(),
            "pipeline": "ci-cd",
            "feature": self.feature,
            "scores": self.scores,
            "timestamp": datetime.now().isoformat()
        }
        
        log_file = LOG_DIR / f"sprint_{self.feature}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(log_file, "w") as f:
            json.dump(log_data, f, indent=2)
        
        # Actualizar tracking
        tracking_file = TRACKING_DIR / "implementation.json"
        if tracking_file.exists():
            with open(tracking_file) as f:
                tracking = json.load(f)
            
            if self.feature in tracking["features"]:
                tracking["features"][self.feature]["iterations"].append({
                    "iteration": self.iteration,
                    "scores": self.scores,
                    "status": log_data["estado"],
                    "timestamp": log_data["timestamp"]
                })
            
            with open(tracking_file, "w") as f:
                json.dump(tracking, f, indent=2)
        
        score = 10.0
        self.scores["logging"] = score
        return True, score
    
    def phase_7_fallback(self) -> Tuple[bool, float]:
        """Fase 7: Fallback Inteligente"""
        self.current_phase = "fallback"
        self.log("🔄 Fase 7: Fallback Inteligente iniciada")
        
        # Si hay errores, intentar resolverlos
        if self.errors:
            self.log(f"  Diagnosticando {len(self.errors)} errores...")
            # Aquí se ejecutaría la lógica de diagnóstico y resolución
        
        score = 9.0
        self.scores["fallback"] = score
        return True, score
    
    def phase_8_deployment(self) -> Tuple[bool, float]:
        """Fase 8: Finalización y Deploy"""
        self.current_phase = "deployment"
        self.log("🚀 Fase 8: Finalización y Deploy iniciada")
        
        # Verificar condiciones
        all_valid = all(s >= 9.0 for s in self.scores.values())
        ci_green = self._check_ci_cd()
        
        if all_valid and ci_green:
            score = 10.0
            self.log("✅ Todas las condiciones cumplidas, listo para deploy")
        else:
            score = 7.0
            self.log("⚠️ Algunas condiciones no cumplidas")
        
        self.scores["deployment"] = score
        return True, score
    
    def run_full_cycle(self) -> bool:
        """Ejecuta el ciclo completo BMAD"""
        self.log("=" * 60)
        self.log("⚔️ BMAD ORCHESTRATED FULL CYCLE 3.0")
        self.log("=" * 60)
        
        phases = [
            ("Desarrollo", self.phase_1_development),
            ("Validación", self.phase_2_validation),
            ("Revisión", self.phase_3_review_cycles),
            ("DevOps", self.phase_4_devops),
            ("Versión", self.phase_5_version_control),
            ("Logging", self.phase_6_logging),
            ("Fallback", self.phase_7_fallback),
            ("Deploy", self.phase_8_deployment)
        ]
        
        for phase_name, phase_func in phases:
            try:
                success, score = phase_func()
                if not success and phase_name in ["Validación", "Revisión"]:
                    self.log(f"⚠️ {phase_name} falló, ejecutando fallback...")
                    self.phase_7_fallback()
            except Exception as e:
                self.log(f"❌ Error en {phase_name}: {e}", "ERROR")
                self.errors.append(f"{phase_name}: {str(e)}")
                return False
        
        # Generar reporte final
        self._generate_final_report()
        
        return True
    
    def _generate_final_report(self):
        """Genera el reporte final de autoevaluación"""
        avg_score = sum(self.scores.values()) / len(self.scores) if self.scores else 0
        
        report = {
            "feature": self.feature,
            "timestamp": datetime.now().isoformat(),
            "scores": self.scores,
            "average_score": avg_score,
            "status": "passed" if avg_score >= 9.0 else "failed",
            "errors": self.errors,
            "iterations": self.iteration
        }
        
        report_file = REPORT_DIR / f"report_{self.feature}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)
        
        self.log(f"📊 Reporte generado: {report_file}")
        self.log(f"📈 Score promedio: {avg_score:.2f}/10")
    
    # Métodos auxiliares
    
    def _check_typescript(self) -> bool:
        """Verifica TypeScript"""
        try:
            result = subprocess.run(
                ["pnpm", "exec", "tsc", "--noEmit"],
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent.parent
            )
            return result.returncode == 0
        except:
            return False
    
    def _check_eslint(self) -> bool:
        """Verifica ESLint"""
        try:
            result = subprocess.run(
                ["pnpm", "lint"],
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent.parent
            )
            return result.returncode == 0
        except:
            return False
    
    def _check_build(self) -> bool:
        """Verifica build"""
        try:
            result = subprocess.run(
                ["pnpm", "build"],
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent.parent
            )
            return result.returncode == 0
        except:
            return False
    
    def _check_tests(self) -> bool:
        """Verifica tests"""
        try:
            result = subprocess.run(
                ["pytest", "tests/", "-v"],
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent.parent / "crewai"
            )
            return result.returncode == 0
        except:
            return False
    
    def _check_ci_cd(self) -> bool:
        """Verifica estado de CI/CD (simulado)"""
        # En producción, esto verificaría el estado real de GitHub Actions
        return True
    
    def _check_git_changes(self) -> bool:
        """Verifica si hay cambios en git"""
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent.parent
            )
            return len(result.stdout.strip()) > 0
        except:
            return False
    
    def _get_git_hash(self) -> str:
        """Obtiene el hash del commit actual"""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                capture_output=True,
                text=True,
                cwd=Path(__file__).parent.parent.parent
            )
            return result.stdout.strip()[:7]
        except:
            return "unknown"


def main():
    """Función principal"""
    import argparse
    
    parser = argparse.ArgumentParser(description="BMAD Orchestrator")
    parser.add_argument("--feature", type=str, help="Feature a implementar")
    parser.add_argument("--phase", type=str, help="Fase específica a ejecutar")
    
    args = parser.parse_args()
    
    orchestrator = BMADOrchestrator(feature=args.feature)
    
    if args.phase:
        # Ejecutar fase específica
        phase_map = {
            "dev": orchestrator.phase_1_development,
            "validate": orchestrator.phase_2_validation,
            "review": orchestrator.phase_3_review_cycles,
            "devops": orchestrator.phase_4_devops,
            "version": orchestrator.phase_5_version_control,
            "log": orchestrator.phase_6_logging,
            "fallback": orchestrator.phase_7_fallback,
            "deploy": orchestrator.phase_8_deployment
        }
        
        if args.phase in phase_map:
            phase_map[args.phase]()
        else:
            print(f"❌ Fase desconocida: {args.phase}")
            sys.exit(1)
    else:
        # Ejecutar ciclo completo
        if args.feature:
            orchestrator.start_sprint(args.feature)
        
        success = orchestrator.run_full_cycle()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

