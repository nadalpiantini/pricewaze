#!/usr/bin/env python3
"""
Feature Tracker - Integración con Plan de Implementación
Rastrea el progreso de cada funcionalidad del plan
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
import sys

# Try tomllib (Python 3.11+) first, fallback to tomli
try:
    import tomllib as tomli
except ImportError:
    try:
        import tomli
    except ImportError:
        print("❌ Error: tomli no está instalado. Ejecuta: pip install tomli")
        sys.exit(1)

PLAN_FILE = Path(__file__).parent.parent.parent / "PLAN_IMPLEMENTACION.md"
TRACKING_FILE = Path(__file__).parent.parent.parent / "bmad" / "tracking" / "implementation.json"
BMAD_CONFIG = Path(__file__).parent.parent.parent / "bmad.toml"


class FeatureTracker:
    """Rastrea el progreso de funcionalidades del plan de implementación"""
    
    def __init__(self):
        self.config = self._load_config()
        self.tracking = self._load_tracking()
    
    def _load_config(self) -> Dict:
        """Carga configuración BMAD"""
        with open(BMAD_CONFIG, "rb") as f:
            # tomllib requires 'rb' mode, tomli also works with 'rb'
            return tomli.load(f)
    
    def _load_tracking(self) -> Dict:
        """Carga o crea tracking"""
        if TRACKING_FILE.exists():
            with open(TRACKING_FILE) as f:
                return json.load(f)
        else:
            return {
                "features": {},
                "current": None,
                "phase": "Fase 1: MVP Plus",
                "started_at": datetime.now().isoformat()
            }
    
    def _save_tracking(self):
        """Guarda tracking"""
        TRACKING_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(TRACKING_FILE, "w") as f:
            json.dump(self.tracking, f, indent=2)
    
    def start_feature(self, feature: str) -> bool:
        """Inicia tracking de una funcionalidad"""
        if feature not in self.tracking["features"]:
            self.tracking["features"][feature] = {
                "started_at": datetime.now().isoformat(),
                "status": "in_progress",
                "iterations": [],
                "tasks_completed": [],
                "tasks_pending": [],
                "scores": [],
                "errors": []
            }
        
        self.tracking["current"] = feature
        self._save_tracking()
        return True
    
    def update_feature_status(self, feature: str, status: str, score: Optional[float] = None):
        """Actualiza el estado de una funcionalidad"""
        if feature not in self.tracking["features"]:
            self.start_feature(feature)
        
        self.tracking["features"][feature]["status"] = status
        self.tracking["features"][feature]["updated_at"] = datetime.now().isoformat()
        
        if score is not None:
            self.tracking["features"][feature]["scores"].append({
                "score": score,
                "timestamp": datetime.now().isoformat()
            })
        
        self._save_tracking()
    
    def add_iteration(self, feature: str, iteration_data: Dict):
        """Agrega una iteración al tracking"""
        if feature not in self.tracking["features"]:
            self.start_feature(feature)
        
        iteration_data["timestamp"] = datetime.now().isoformat()
        self.tracking["features"][feature]["iterations"].append(iteration_data)
        self._save_tracking()
    
    def complete_task(self, feature: str, task: str):
        """Marca una tarea como completada"""
        if feature not in self.tracking["features"]:
            self.start_feature(feature)
        
        if task not in self.tracking["features"][feature]["tasks_completed"]:
            self.tracking["features"][feature]["tasks_completed"].append(task)
        
        if task in self.tracking["features"][feature]["tasks_pending"]:
            self.tracking["features"][feature]["tasks_pending"].remove(task)
        
        self._save_tracking()
    
    def get_feature_progress(self, feature: str) -> Dict:
        """Obtiene el progreso de una funcionalidad"""
        if feature not in self.tracking["features"]:
            return {"status": "not_started", "progress": 0}
        
        feat = self.tracking["features"][feature]
        total_tasks = len(feat.get("tasks_completed", [])) + len(feat.get("tasks_pending", []))
        completed = len(feat.get("tasks_completed", []))
        
        progress = (completed / total_tasks * 100) if total_tasks > 0 else 0
        
        return {
            "status": feat["status"],
            "progress": progress,
            "completed_tasks": len(feat.get("tasks_completed", [])),
            "total_tasks": total_tasks,
            "iterations": len(feat.get("iterations", [])),
            "avg_score": sum(s["score"] for s in feat.get("scores", [])) / len(feat["scores"]) if feat.get("scores") else 0
        }
    
    def get_phase_summary(self, phase: str) -> Dict:
        """Obtiene resumen de una fase"""
        phase_features = {
            "Fase 1: MVP Plus": ["comparison", "alerts", "gallery", "reviews"],
            "Fase 2: Growth Features": ["chat", "valuation", "heatmap", "crm"],
            "Fase 3: Scale Features": ["insights", "api"]
        }
        
        features = phase_features.get(phase, [])
        summary = {
            "phase": phase,
            "features": {},
            "total_progress": 0,
            "features_completed": 0,
            "features_in_progress": 0
        }
        
        for feature in features:
            progress = self.get_feature_progress(feature)
            summary["features"][feature] = progress
            summary["total_progress"] += progress["progress"]
            
            if progress["status"] == "completed":
                summary["features_completed"] += 1
            elif progress["status"] == "in_progress":
                summary["features_in_progress"] += 1
        
        if features:
            summary["total_progress"] /= len(features)
        
        return summary
    
    def generate_report(self) -> str:
        """Genera un reporte de progreso"""
        report = []
        report.append("=" * 60)
        report.append("📊 BMAD Implementation Progress Report")
        report.append("=" * 60)
        report.append(f"Generated: {datetime.now().isoformat()}")
        report.append("")
        
        # Resumen por fase
        phases = [
            "Fase 1: MVP Plus",
            "Fase 2: Growth Features",
            "Fase 3: Scale Features"
        ]
        
        for phase in phases:
            summary = self.get_phase_summary(phase)
            report.append(f"\n{phase}")
            report.append("-" * 60)
            report.append(f"Progress: {summary['total_progress']:.1f}%")
            report.append(f"Completed: {summary['features_completed']}")
            report.append(f"In Progress: {summary['features_in_progress']}")
            report.append("")
            
            for feature, progress in summary["features"].items():
                report.append(f"  • {feature}: {progress['progress']:.1f}% ({progress['status']})")
        
        # Feature actual
        if self.tracking.get("current"):
            current = self.tracking["current"]
            progress = self.get_feature_progress(current)
            report.append(f"\n🔍 Current Feature: {current}")
            report.append(f"   Status: {progress['status']}")
            report.append(f"   Progress: {progress['progress']:.1f}%")
            report.append(f"   Iterations: {progress['iterations']}")
            report.append(f"   Avg Score: {progress['avg_score']:.2f}/10")
        
        return "\n".join(report)


def main():
    """CLI para feature tracker"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Feature Tracker")
    parser.add_argument("--start", type=str, help="Iniciar tracking de feature")
    parser.add_argument("--status", type=str, help="Ver status de feature")
    parser.add_argument("--update", type=str, help="Actualizar status de feature")
    parser.add_argument("--score", type=float, help="Score para update")
    parser.add_argument("--report", action="store_true", help="Generar reporte")
    parser.add_argument("--phase", type=str, help="Resumen de fase")
    
    args = parser.parse_args()
    
    tracker = FeatureTracker()
    
    if args.start:
        tracker.start_feature(args.start)
        print(f"✅ Tracking iniciado para: {args.start}")
    
    elif args.status:
        progress = tracker.get_feature_progress(args.status)
        print(f"\n📊 Status de {args.status}:")
        print(f"   Progress: {progress['progress']:.1f}%")
        print(f"   Status: {progress['status']}")
        print(f"   Tasks: {progress['completed_tasks']}/{progress['total_tasks']}")
        print(f"   Iterations: {progress['iterations']}")
        print(f"   Avg Score: {progress['avg_score']:.2f}/10")
    
    elif args.update:
        tracker.update_feature_status(args.update, "in_progress", args.score)
        print(f"✅ Status actualizado para: {args.update}")
    
    elif args.report:
        print(tracker.generate_report())
    
    elif args.phase:
        summary = tracker.get_phase_summary(args.phase)
        print(f"\n📋 Resumen de {args.phase}:")
        print(f"   Progress: {summary['total_progress']:.1f}%")
        print(f"   Completed: {summary['features_completed']}")
        print(f"   In Progress: {summary['features_in_progress']}")
    
    else:
        print(tracker.generate_report())


if __name__ == "__main__":
    main()

