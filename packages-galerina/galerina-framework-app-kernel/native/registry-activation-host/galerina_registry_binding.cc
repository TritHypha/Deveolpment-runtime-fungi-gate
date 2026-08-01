#include "node.h"
#include "v8.h"

#include <array>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <memory>
#include <string>
#include <vector>

namespace galerina_registry_host {

constexpr std::size_t kMaximumGenerationBytes = 16U * 1024U * 1024U;

extern "C" {
struct GalerinaProductionHostResultV1 {
  std::uint32_t abi_version;
  std::int32_t verdict;
  std::int64_t os_code;
  std::uint64_t byte_length;
  std::uint8_t production_authorizing;
  std::uint8_t reserved[7];
  std::uint8_t reason[96];
  std::uint8_t platform[16];
  std::uint8_t generation_id[64];
  std::uint8_t adapter_source_sha256[64];
};

std::int32_t galerina_registry_publish_generation_v1(
    const std::uint8_t* directory_ptr,
    std::size_t directory_len,
    const std::uint8_t* generation_id_ptr,
    std::size_t generation_id_len,
    const std::uint8_t* generation_bytes_ptr,
    std::size_t generation_bytes_len,
    GalerinaProductionHostResultV1* out_result);
}

std::string BoundedText(const std::uint8_t* bytes, std::size_t length) {
  std::size_t size = 0;
  while (size < length && bytes[size] != 0) ++size;
  return std::string(reinterpret_cast<const char*>(bytes), size);
}

v8::Local<v8::String> Text(v8::Isolate* isolate, const std::string& value) {
  return v8::String::NewFromUtf8(
             isolate,
             value.data(),
             v8::NewStringType::kNormal,
             static_cast<int>(value.size()))
      .ToLocalChecked();
}

struct BindingState {
  v8::Global<v8::Object> current_receipt;
};

BindingState* CallbackState(
    const v8::FunctionCallbackInfo<v8::Value>& args) {
  if (!args.Data()->IsExternal()) return nullptr;
  return static_cast<BindingState*>(
      args.Data().As<v8::External>()->Value());
}

void CleanupBindingState(void* pointer) {
  BindingState* state = static_cast<BindingState*>(pointer);
  state->current_receipt.Reset();
  delete state;
}

bool SetField(v8::Local<v8::Context> context,
              v8::Local<v8::Object> object,
              const char* name,
              v8::Local<v8::Value> value) {
  return object
      ->CreateDataProperty(
          context,
          v8::String::NewFromUtf8(context->GetIsolate(), name)
              .ToLocalChecked(),
          value)
      .FromMaybe(false);
}

void ReturnDenial(const v8::FunctionCallbackInfo<v8::Value>& args,
                  const char* reason) {
  v8::Isolate* isolate = args.GetIsolate();
  v8::Local<v8::Context> context = isolate->GetCurrentContext();
  v8::Local<v8::Object> result = v8::Object::New(isolate);
  if (!SetField(context,
                result,
                "schema",
                v8::String::NewFromUtf8Literal(
                    isolate, "galerina.registry.production-host-result.v1")) ||
      !SetField(context, result, "verdict", v8::Integer::New(isolate, -1)) ||
      !SetField(context,
                result,
                "reason",
                v8::String::NewFromUtf8(isolate, reason).ToLocalChecked()) ||
      !SetField(context, result, "productionAuthorizing", v8::False(isolate)) ||
      !result->SetIntegrityLevel(context, v8::IntegrityLevel::kFrozen)
           .FromMaybe(false)) {
    args.GetReturnValue().Set(v8::Null(isolate));
    return;
  }
  args.GetReturnValue().Set(result);
}

void PublishGeneration(const v8::FunctionCallbackInfo<v8::Value>& args) {
  v8::Isolate* isolate = args.GetIsolate();
  v8::HandleScope scope(isolate);
  v8::Local<v8::Context> context = isolate->GetCurrentContext();
  BindingState* state = CallbackState(args);
  if (state == nullptr) {
    ReturnDenial(args, "PRODUCTION_HOST_BINDING_STATE_REFUSED");
    return;
  }
  state->current_receipt.Reset();
  if (args.Length() != 3 || !args[0]->IsString() ||
      !args[1]->IsString() || !args[2]->IsUint8Array()) {
    ReturnDenial(args, "PRODUCTION_HOST_JS_INPUT_REFUSED");
    return;
  }

  v8::String::Utf8Value directory(isolate, args[0]);
  v8::String::Utf8Value generation_id(isolate, args[1]);
  if (*directory == nullptr || *generation_id == nullptr ||
      generation_id.length() != 64) {
    ReturnDenial(args, "PRODUCTION_HOST_JS_TEXT_REFUSED");
    return;
  }

  v8::Local<v8::Uint8Array> view = args[2].As<v8::Uint8Array>();
  if (view->Buffer()->IsSharedArrayBuffer() || view->ByteLength() == 0 ||
      view->ByteLength() > kMaximumGenerationBytes) {
    ReturnDenial(args, "PRODUCTION_HOST_JS_BYTES_REFUSED");
    return;
  }
  std::shared_ptr<v8::BackingStore> backing =
      view->Buffer()->GetBackingStore();
  if (!backing || view->ByteOffset() > backing->ByteLength() ||
      view->ByteLength() > backing->ByteLength() - view->ByteOffset()) {
    ReturnDenial(args, "PRODUCTION_HOST_JS_BYTES_REFUSED");
    return;
  }

  std::vector<std::uint8_t> owned(view->ByteLength());
  std::memcpy(owned.data(),
              static_cast<const std::uint8_t*>(backing->Data()) +
                  view->ByteOffset(),
              owned.size());

  GalerinaProductionHostResultV1 native{};
  const std::int32_t status = galerina_registry_publish_generation_v1(
      reinterpret_cast<const std::uint8_t*>(*directory),
      static_cast<std::size_t>(directory.length()),
      reinterpret_cast<const std::uint8_t*>(*generation_id),
      static_cast<std::size_t>(generation_id.length()),
      owned.data(),
      owned.size(),
      &native);
  std::fill(owned.begin(), owned.end(), std::uint8_t{0});

  v8::Local<v8::Object> result = v8::Object::New(isolate);
  const std::string reason = status == 1
                                 ? "NONE"
                                 : BoundedText(native.reason,
                                               std::size(native.reason));
  const std::string platform =
      BoundedText(native.platform, std::size(native.platform));
  const std::string output_id =
      BoundedText(native.generation_id, std::size(native.generation_id));
  const std::string source_digest = BoundedText(
      native.adapter_source_sha256, std::size(native.adapter_source_sha256));
  const bool complete =
      SetField(context,
               result,
               "schema",
               v8::String::NewFromUtf8Literal(
                   isolate, "galerina.registry.production-host-result.v1")) &&
      SetField(context,
               result,
               "verdict",
               v8::Integer::New(isolate, native.verdict)) &&
      SetField(context, result, "reason", Text(isolate, reason)) &&
      SetField(context, result, "platform", Text(isolate, platform)) &&
      SetField(context, result, "generationId", Text(isolate, output_id)) &&
      SetField(context,
               result,
               "byteLength",
               v8::Number::New(isolate,
                               static_cast<double>(native.byte_length))) &&
      SetField(context,
               result,
               "adapterSourceSha256",
               Text(isolate, source_digest)) &&
      SetField(context,
               result,
               "hostKind",
               v8::String::NewFromUtf8Literal(isolate, "STATIC_LINKED_NODE")) &&
      SetField(context,
               result,
               "productionAuthorizing",
               v8::False(isolate));
  if (!complete ||
      !result->SetIntegrityLevel(context, v8::IntegrityLevel::kFrozen)
           .FromMaybe(false)) {
    ReturnDenial(args, "PRODUCTION_HOST_RESULT_CONSTRUCTION_REFUSED");
    return;
  }
  if (status == 1) state->current_receipt.Reset(isolate, result);
  args.GetReturnValue().Set(result);
}

void IsReceipt(const v8::FunctionCallbackInfo<v8::Value>& args) {
  v8::Isolate* isolate = args.GetIsolate();
  v8::HandleScope scope(isolate);
  BindingState* state = CallbackState(args);
  if (state == nullptr || state->current_receipt.IsEmpty() ||
      args.Length() != 1 || !args[0]->IsObject() || args[0]->IsProxy()) {
    args.GetReturnValue().Set(v8::False(isolate));
    return;
  }
  if (!state->current_receipt.Get(isolate)->StrictEquals(args[0])) {
    args.GetReturnValue().Set(v8::False(isolate));
    return;
  }
  state->current_receipt.Reset();
  args.GetReturnValue().Set(v8::True(isolate));
}

void Initialize(v8::Local<v8::Object> exports,
                v8::Local<v8::Value>,
                v8::Local<v8::Context> context,
                void*) {
  v8::Isolate* isolate = context->GetIsolate();
  BindingState* state = new BindingState();
  node::AddEnvironmentCleanupHook(isolate, CleanupBindingState, state);
  v8::Local<v8::External> callback_state = v8::External::New(isolate, state);
  v8::Local<v8::Function> publish;
  v8::Local<v8::Function> is_receipt;
  const bool complete =
      v8::Function::New(context, PublishGeneration, callback_state)
          .ToLocal(&publish) &&
      v8::Function::New(context, IsReceipt, callback_state)
          .ToLocal(&is_receipt) &&
      SetField(context, exports, "publishGeneration", publish) &&
      SetField(context, exports, "isReceipt", is_receipt) &&
      exports->SetIntegrityLevel(context, v8::IntegrityLevel::kFrozen)
          .FromMaybe(false);
  if (!complete) {
    isolate->ThrowException(v8::Exception::Error(
        v8::String::NewFromUtf8Literal(
            isolate, "PRODUCTION_HOST_BINDING_INITIALIZATION_REFUSED")));
  }
}

NODE_MODULE_LINKED(galerina_registry_durability, Initialize)

}  // namespace galerina_registry_host
