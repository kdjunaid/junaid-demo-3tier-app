import { Loader2, Search, XCircle } from "lucide-react";
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";

// 🎨 Array of themes with FULL Tailwind class names
const themes = [
  {
    name: "Yellow",
    text: "text-yellow-500",
    button: "bg-yellow-500 hover:bg-yellow-600",
    ring: "focus:ring-yellow-400",
    bg: "from-yellow-100 to-yellow-200",
    tableHeader: "bg-yellow-50",
    tableRow: "bg-yellow-100",
  },
  {
    name: "Blue",
    text: "text-blue-500",
    button: "bg-blue-500 hover:bg-blue-600",
    ring: "focus:ring-blue-400",
    bg: "from-blue-100 to-blue-200",
    tableHeader: "bg-blue-50",
    tableRow: "bg-blue-100",
  },
  {
    name: "Green",
    text: "text-green-500",
    button: "bg-green-500 hover:bg-green-600",
    ring: "focus:ring-green-400",
    bg: "from-green-100 to-green-200",
    tableHeader: "bg-green-50",
    tableRow: "bg-green-100",
  },
];

const ResultChecker = () => {
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
// ******************************Change color**********************************************

  const [theme, setTheme] = useState(themes[2]); //Dev use 0, stage use 1,production use 2

  // ******************************Change color**********************************************
  const fetchResult = async (id) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/result/${id}`
      );

      if (!response.ok) {
        throw new Error("❌ Result not found");
      }

      return await response.json();
    } catch (error) {
      throw error.message || "Something went wrong";
    }
  };

  const handleCheckResult = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    toast.promise(fetchResult(studentId), {
      loading: "Fetching result...",
      success: (res) => {
        setResult(res);
        setLoading(false);
        return <b>Result loaded successfully!</b>;
      },
      error: (err) => {
        setLoading(false);
        return <b>{err}</b>;
      },
    });
  };

  const calculateAverage = (subjects) => {
    const marks = Object.values(subjects);
    return (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(2);
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${theme.bg} p-6 flex flex-col lg:flex-row gap-8 justify-center items-start lg:items-center`}
    >
      {/* Search Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md">
        <img
          src="/Ostad.png"
          alt="Logo"
          className="w-20 mx-auto mb-6"
        />
        <h1
          className={`text-2xl sm:text-3xl font-bold text-center ${theme.text} mb-6`}
        >
          Check Student Result
        </h1>

        

        <form onSubmit={handleCheckResult} className="space-y-5">
          {/* Student ID */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-start">
              Student ID
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                name="studentId"
                placeholder="Enter Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className={`flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 ${theme.ring}`}
              />
              <button
                type="submit"
                disabled={loading}
                className={`${theme.button} text-white font-bold p-3 rounded-xl transition duration-300 flex items-center justify-center`}
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </form>
        <Toaster position="top-center" reverseOrder={false} />
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-3xl  overflow-y-auto">
        {!result ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
            <XCircle className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">No result to display</p>
            <p className="text-sm">Enter a valid Student ID and search</p>
          </div>
        ) : (
          <>
            <h2
              className={`text-xl sm:text-2xl font-bold ${theme.text} mb-6 text-center`}
            >
              Result of {result.name} ({result.id})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm sm:text-base">
                <thead>
                  <tr className={`${theme.tableHeader}`}>
                    <th className="border-b p-3">Subject</th>
                    <th className="border-b p-3">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.subjects).map(([subject, mark], idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 transition duration-200"
                    >
                      <td className="border-b p-3">{subject}</td>
                      <td className="border-b p-3">{mark}</td>
                    </tr>
                  ))}
                  <tr className={`font-bold ${theme.tableRow}`}>
                    <td className="border-b p-3">Average</td>
                    <td className="border-b p-3">
                      {calculateAverage(result.subjects)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResultChecker;
