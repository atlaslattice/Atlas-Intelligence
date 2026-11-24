"""Optional numerical port on the EXISTING Atlas WorkLearning NeuralIntegration.

No model invocation, service startup, external permission, new retriever or
activation of alpha>0 occurs during attachment. The trusted WorkLearning
service must resolve current source USE before it computes/provides query vectors
and recheck USE+RETURN before it releases or serializes the final result.
"""
from __future__ import annotations
from .fabric import AtlasOneNeuralFabric,NeuralFabricError,REGISTRY_SHA256

class WorkLearningNeuralPort:
    def __init__(self, fabric, *, origin_integration_sha256, model_pin):
        self.fabric=fabric
        self.origin_integration_sha256=origin_integration_sha256
        self.model_pin=model_pin
    @classmethod
    def from_existing_integration(cls,integration,*,original_registry_bytes=None,vector_asset_bytes=None,
                                  profile='GEOMETREE',alpha=0.0,seed=145):
        # Accept the real, pinned NeuralIntegration's public data contracts.
        # Never accept requester-chosen code paths, account IDs, epochs or rights.
        manifest=getattr(integration,'manifest',None)
        if not isinstance(manifest,dict) or not isinstance(getattr(integration,'files',None),dict):
            raise NeuralFabricError('EXISTING_NEURAL_INTEGRATION_REQUIRED')
        name=manifest.get('vectors')
        declared=integration.files.get(name)
        if not isinstance(declared,dict) or not isinstance(declared.get('sha256'),str):
            raise NeuralFabricError('EXISTING_VECTOR_PIN_REQUIRED')
        encoder=getattr(integration,'encoder',None)
        model_pin=getattr(encoder,'manifest_sha256',None)
        if not isinstance(model_pin,str) or len(model_pin)!=64:
            raise NeuralFabricError('EXISTING_SEMANTIC_ENCODER_REQUIRED')
        source=getattr(integration,'sha256',None)
        if not isinstance(source,str) or len(source)!=64:
            raise NeuralFabricError('EXISTING_INTEGRATION_PIN_REQUIRED')
        fabric=AtlasOneNeuralFabric(integration.node_vectors,vector_asset_sha256=declared['sha256'],
                 encoder_revision=model_pin,source_registry_bytes=original_registry_bytes,
                 vector_asset_bytes=vector_asset_bytes,profile=profile,alpha=alpha,seed=seed)
        return cls(fabric,origin_integration_sha256=source,model_pin=model_pin)
    def prepare_from_existing_query_embedding(self,embedding,*,top_k=10,use_gates=False):
        return self.fabric.forward(embedding,top_k=top_k,use_gates=use_gates)
    def descriptor(self):
        x=self.fabric.descriptor().copy()
        return {**x,'existingIntegrationSha256':self.origin_integration_sha256,
                'modelManifestSha256':self.model_pin,'newEncoderCreated':False,'newGatewayCreated':False,
                'liveSourcePermissionVerified':False}
