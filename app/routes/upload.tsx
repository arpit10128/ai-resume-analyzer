import { type FormEvent, useState } from "react";
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID, parseFeedback } from "~/lib/utils";
import { prepareInstructions } from "../../constants";
import { recordAiAnalysisLatency } from "~/lib/latency";

const Upload = () => {
  const { auth, isLoading, fs, ai, kv } = usePuterStore();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setErrorText("");
    setIsProcessing(true);

    const fail = (message: string) => {
      setErrorText(message);
      setStatusText("");
      setIsProcessing(false);
    };

    try {
      setStatusText("Uploading the file...");

      const uploadedFile = await fs.upload([file]);

      if (!uploadedFile) {
        return fail("Error: Failed to upload file");
      }

      setStatusText("Converting to image...");

      const imageFile = await convertPdfToImage(file);

      if (!imageFile.file) {
        return fail(
          "Error: Failed to convert PDF to image",
        );
      }

      setStatusText("Uploading the image...");

      const uploadedImage = await fs.upload([
        imageFile.file,
      ]);

      if (!uploadedImage) {
        return fail("Error: Failed to upload image");
      }

      setStatusText("Preparing data...");

      const uuid = generateUUID();

      const data = {
        id: uuid,
        resumePath: uploadedFile.path,
        imagePath: uploadedImage.path,
        companyName,
        jobTitle,
        jobDescription,
        feedback: "" as "" | Feedback,
      };

      await kv.set(`resume:${uuid}`, JSON.stringify(data));

      setStatusText("Analyzing...");

      // Measure only the AI provider request, excluding upload and PDF conversion.
      const aiStartedAt = performance.now();

      let feedback;

      try {
        feedback = await ai.feedback(
          uploadedFile.path,
          prepareInstructions({ jobTitle, jobDescription }),
        );
      } catch (error) {
        const durationMs = performance.now() - aiStartedAt;

        recordAiAnalysisLatency(durationMs, "error");

        console.info(
          "[AI_LATENCY]",
          JSON.stringify({
            durationMs,
            status: "error",
          }),
        );

        throw error;
      }

      const durationMs = performance.now() - aiStartedAt;
      const aiStatus = feedback ? "success" : "error";

      recordAiAnalysisLatency(durationMs, aiStatus);

      // Consumed by the Playwright benchmark script.
      console.info(
        "[AI_LATENCY]",
        JSON.stringify({
          durationMs,
          status: aiStatus,
        }),
      );

      if (!feedback) {
        return fail("Error: Failed to analyze resume");
      }

      const content = feedback.message.content;

      const feedbackText =
        typeof content === "string"
          ? content
          : content[0]?.text;

      if (typeof feedbackText !== "string") {
        return fail("Error: Failed to analyze resume");
      }

      console.debug(
        "[AI_RESPONSE_FORMAT]",
        feedbackText.slice(0, 1500),
      );

      data.feedback = parseFeedback(feedbackText);

      await kv.set(`resume:${uuid}`, JSON.stringify(data));

      setStatusText("Analysis complete, redirecting...");

      navigate(`/resume/${uuid}`);
    } catch (err) {
      const detail =
        err instanceof Error
          ? err.message
          : "Unknown error";

      fail(`Error: ${detail}. Please try again.`);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    const companyName = String(
      formData.get("company-name") ?? "",
    );
    const jobTitle = String(
      formData.get("job-title") ?? "",
    );
    const jobDescription = String(
      formData.get("job-description") ?? "",
    );

    if (!file) {
      setErrorText("Please upload a resume PDF.");
      return;
    }

    void handleAnalyze({
      companyName,
      jobTitle,
      jobDescription,
      file,
    });
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>

          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img
                src="/images/resume-scan.gif"
                alt="Analyzing resume"
                className="w-full"
              />
            </>
          ) : (
            <h2>
              Drop your resume for an ATS score and
              improvement tips
            </h2>
          )}

          {errorText && !isProcessing && (
            <p
              role="alert"
              className="text-red-600 text-xl"
            >
              {errorText}
            </p>
          )}

          <div hidden={isProcessing} className="w-full">
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-8"
            >
              <div className="form-div">
                <label htmlFor="company-name">
                  Company Name
                </label>
                <input
                  type="text"
                  name="company-name"
                  placeholder="Company Name"
                  id="company-name"
                />
              </div>

              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input
                  type="text"
                  name="job-title"
                  placeholder="Job Title"
                  id="job-title"
                />
              </div>

              <div className="form-div">
                <label htmlFor="job-description">
                  Job Description
                </label>
                <textarea
                  rows={5}
                  name="job-description"
                  placeholder="Job Description"
                  id="job-description"
                />
              </div>

              <div className="form-div">
                <label htmlFor="uploader">
                  Upload Resume
                </label>
                <FileUploader
                  onFileSelect={handleFileSelect}
                />
              </div>

              <button
                className="primary-button"
                type="submit"
                disabled={isProcessing || isLoading}
              >
                Analyze Resume
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Upload;
